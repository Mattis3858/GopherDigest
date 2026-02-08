package controllers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"gopher-digest/configs"
	"gopher-digest/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
)

// ==========================================
// 定義與 Python AI Service 溝通的資料結構
// ==========================================

// PythonRequest: 送給 Python 的資料
type PythonRequest struct {
	Content string `json:"content"`
	URL     string `json:"url"` // ✨ 新增這行
}
// PythonResponse: 從 Python 收回來的資料 (對應 Pydantic)
type PythonResponse struct {
	Title   string   `json:"title"`   // ✨ 新增這行：接收 Python 回傳的標題
	Summary string   `json:"summary"`
	Tags    []string `json:"tags"`
}

// ==========================================
// Controller 邏輯
// ==========================================

// CreateArticle: 新增文章並呼叫 AI 生成摘要
func CreateArticle(c *gin.Context) {
	articleCollection := configs.GetCollection(configs.DB, "articles")

	var article models.Article

	// 這裡前端現在只會傳 url (和選填的 content)，title 會是空的
	if err := c.BindJSON(&article); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "無效的請求格式: " + err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	fmt.Println("正在呼叫 Python AI Service...")
	
	// 呼叫 Python (注意：這裡的回傳值要多接一個 title)
	aiTitle, summary, tags, err := callPythonAIService(article.Content, article.URL)

	if err != nil {
		fmt.Printf("⚠️ AI 服務連線失敗: %v\n", err)
		article.Summary = "摘要生成失敗 (AI Service Unavailable)"
		article.Tags = []string{"Error"}
		// 如果 AI 失敗，且前端沒傳標題，只好用 URL 當標題，避免空白
		if article.Title == "" {
			article.Title = "Unknown Title (Auto-generation failed)"
		}
	} else {
		// ✅ 成功：將 AI 提取的標題填入 article 物件
		article.Title = aiTitle
		article.Summary = summary
		article.Tags = tags
		fmt.Printf("✅ AI 處理成功: %s\n", aiTitle)
	}

	article.CreatedAt = time.Now()

	result, err := articleCollection.InsertOne(ctx, article)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "寫入資料庫失敗: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Article created successfully",
		"data":    result,
		"title":   article.Title, 
	})
}

// GetArticles: 取得所有文章列表
func GetArticles(c *gin.Context) {
	articleCollection := configs.GetCollection(configs.DB, "articles")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var articles []models.Article
	
	// 查詢所有文件 (bson.M{} 代表空條件，即查詢全部)
	// Sort: 依照 created_at 倒序排列 (最新的在上面)
	// 注意: 若要 Sort 需要在 options 裡設定，這裡先做基本查詢
	cursor, err := articleCollection.Find(ctx, bson.M{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	// 遍歷 Cursor 將資料解碼到 slice
	for cursor.Next(ctx) {
		var singleArticle models.Article
		if err := cursor.Decode(&singleArticle); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		articles = append(articles, singleArticle)
	}

	c.JSON(http.StatusOK, gin.H{"data": articles})
}

// ==========================================
// 內部 Helper Functions
// ==========================================

// callPythonAIService: 發送 HTTP POST 到 Python FastAPI
// Python Service 的位址 (確保你的 Python main.py 有跑起來)
func callPythonAIService(content string, url string) (string, string, []string, error) {
	pythonAPI := "http://localhost:8000/summarize"

	reqBody, _ := json.Marshal(PythonRequest{
		Content: content,
		URL:     url,
	})

	client := &http.Client{Timeout: 90 * time.Second}
	resp, err := client.Post(pythonAPI, "application/json", bytes.NewBuffer(reqBody))
	if err != nil {
		return "", "", nil, fmt.Errorf("無法連線到 Python Service: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return "", "", nil, fmt.Errorf("Python Service 回傳錯誤碼: %d", resp.StatusCode)
	}

	var result PythonResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", "", nil, fmt.Errorf("解析 Python 回傳資料失敗: %v", err)
	}

	// 回傳 title, summary, tags
	return result.Title, result.Summary, result.Tags, nil
}