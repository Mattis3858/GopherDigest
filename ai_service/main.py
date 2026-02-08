import os
import json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List
import uvicorn
from dotenv import load_dotenv

from curl_cffi import requests
from bs4 import BeautifulSoup

# LangChain 相關
from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser

load_dotenv()

app = FastAPI()

llm = ChatOllama(model="gemma3:4b", temperature=0)

class ArticleSummary(BaseModel):
    title: str = Field(description="文章的標題。")
    summary: str = Field(description="文章的繁體中文摘要，約500字，需包含核心技術與結論")
    tags: List[str] = Field(description="3-5 個相關的技術標籤")

parser = PydanticOutputParser(pydantic_object=ArticleSummary)

def __custom_scraper(url: str) -> str:

    headers = {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
    
    # --- 策略 1: 嘗試 JSON API ---
    try:
        api_url = f"{url}?format=json"
        response = requests.get(api_url, impersonate="chrome120", headers=headers, timeout=10)
        
        if response.status_code == 200:
            text = response.text
            start_idx = text.find('{')
            if start_idx != -1:
                try:
                    # 嘗試解析，失敗會跳到下方的 except
                    data = json.loads(text[start_idx:])
                    value = data.get("payload", {}).get("value", {})
                    if value:
                        paragraphs = value.get("content", {}).get("bodyModel", {}).get("paragraphs", [])
                        content = "\n".join([p.get("text", "") for p in paragraphs])
                        if len(content) > 100:
                            print("✅ 透過 JSON API 抓取成功")
                            return content
                except json.JSONDecodeError as je:
                    print(f"💡 JSON 格式異常 ({je})，準備切換 HTML 模式...")
    except Exception as e:
        print(f"💡 JSON 請求失敗: {e}")

    # --- 策略 2: 嘗試 HTML 解析 (備援) ---
    print(f"⚠️ 正在對 {url} 執行 HTML 解析備援...")
    try:
        html_res = requests.get(url, impersonate="chrome120", timeout=100)
        if html_res.status_code == 200:
            soup = BeautifulSoup(html_res.text, 'html.parser')
            
            # 優先抓取 article 標籤，這能過濾掉大部分雜質
            article = soup.find('article')
            target = article if article else soup
            
            # 抓取常見的文章內容標籤
            tags = target.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'li'])
            content = "\n\n".join([t.get_text().strip() for t in tags if t.get_text().strip()])
            
            if len(content) > 100:
                print("✅ 透過 HTML 解析成功")
                return content
            else:
                print("❌ HTML 解析內容過短")
    except Exception as e:
        print(f"❌ HTML 備援模式也失敗: {e}")
    
    return ""
# --- 3. Prompt 設定 ---
system_prompt = """
# Role
你是一位資深的技術內容主編，擅長快速解析複雜的技術文章並提取核心價值。

# Objective
你的任務是閱讀使用者提供的文章內容，並產出結構化的摘要資訊。

# Constraints
1. **標題準確性**：優先使用文章原始標題。
2. **語言要求**：摘要與標題必須使用**繁體中文 (Traditional Chinese, Taiwan)**。
3. **輸出格式**：只回傳符合 Schema 定義的 JSON。
4. **內容完整性**：摘要中需提及關鍵技術邏輯。

{format_instructions}
"""

prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("human", "請針對以下文章內容進行摘要與標籤提取：\n\n<article_content>\n{content}\n</article_content>"),
]).partial(format_instructions=parser.get_format_instructions())

chain = prompt | llm | parser

# --- 4. API Endpoints ---
class ArticleRequest(BaseModel):
    url: str

@app.post("/summarize", response_model=ArticleSummary)
async def summarize_article(request: ArticleRequest):
    print(f"🚀 開始抓取文章: {request.url}")
    
    # 調用自定義爬蟲
    final_content = __custom_scraper(request.url)
    
    if not final_content:
        raise HTTPException(status_code=400, detail="無法抓取該網址內容，可能是網站防護升級或網址無效")

    print(f"📝 抓取成功，長度約 {len(final_content)} 字")

    # 內容截斷邏輯 (視 LLM context window 調整，Gemma 3 可處理較長內容，可設 3000-5000)
    if len(final_content) > 5000:
        final_content = final_content[:5000]
        print("⚠️ 文章過長，已截斷至前 5000 字")

    try:
        print(f"🤖 送入 AI ({llm.model}) 處理中...")
        return chain.invoke({"content": final_content})
    except Exception as e:
        print(f"❌ LLM 處理錯誤: {e}")
        raise HTTPException(status_code=500, detail=f"AI 處理失敗: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)