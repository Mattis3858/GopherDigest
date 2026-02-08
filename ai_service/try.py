from curl_cffi import requests
import json
from bs4 import BeautifulSoup

def __crawl_medium_url(url: str) -> dict:
    """
    獲取Medium文章內容 (JSON 優先，HTML 備援)
    """
    api_url = f"{url}?format=json"
    headers = {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }

    try:
        # Step 1: 嘗試獲取 JSON
        response = requests.get(api_url, impersonate="chrome120", headers=headers)
        
        if response.status_code == 200:
            text = response.text
            # 尋找第一個 '{' 的位置，避開任何前綴字串
            start_idx = text.find('{')
            if start_idx != -1:
                try:
                    data = json.loads(text[start_idx:])
                    value = data.get("payload", {}).get("value", {})
                    if value:
                        paragraphs = value.get("content", {}).get("bodyModel", {}).get("paragraphs", [])
                        clap_count = value.get("virtuals", {}).get("totalClapCount", 0)
                        language = value.get("detectedLanguage", "unknown")
                        
                        return {
                            "source": "JSON_API",
                            "likes": clap_count,
                            "language": language,
                            "content": "".join(paragraph.get("text", "") for paragraph in paragraphs),
                        }
                except Exception as e:
                    print(f"JSON 解析錯誤，嘗試切換 HTML 模式...")

        # Step 2: 如果 JSON 失敗，改用 HTML 解析 (Fallback)
        print(f"JSON 模式無效 (Code: {response.status_code})，執行 HTML 解析模式...")
        html_response = requests.get(url, impersonate="chrome120")
        if html_response.status_code == 200:
            soup = BeautifulSoup(html_response.text, 'html.parser')
            
            # Medium 文章通常在 <article> 標籤中
            article = soup.find('article')
            if not article:
                article = soup # 如果找不到 article，就抓全體
                
            # 抓取所有段落與標題
            tags = article.find_all(['p', 'h1', 'h2', 'h3', 'blockquote'])
            content = "\n\n".join([t.get_text() for t in tags])
            
            return {
                "source": "HTML_PARSER",
                "likes": "N/A",
                "content": content
            }

    except Exception as e:
        return {"error": f"發生異常: {str(e)}"}

    return {"error": "無法獲取任何內容"}

if __name__ == "__main__":
    target_url = "https://medium.com/data-science-collective/developers-are-gaming-their-github-profiles-3f58f1f00c2a"
    result = __crawl_medium_url(target_url)
    
    # 輸出結果 (只顯示前 200 個字檢查)
    if "content" in result:
        print(f"成功！來源: {result['source']}")
        print(f"內容摘要: {result['content'][:1000]}...")
    else:
        print(result)