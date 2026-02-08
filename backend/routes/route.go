package routes

import (
	"gopher-digest/controllers"

	"github.com/gin-gonic/gin"
)

func UserRoute(router *gin.Engine) {
	router.POST("/articles", controllers.CreateArticle) // 新增文章 (觸發 AI)
	router.GET("/articles", controllers.GetArticles)    // 取得列表
}