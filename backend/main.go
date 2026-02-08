package main

import (
	"gopher-digest/configs"
	"gopher-digest/routes"
	"time" // 記得 import time

	"github.com/gin-contrib/cors" // 引入 cors
	"github.com/gin-gonic/gin"
)

func main() {
    configs.ConnectDB()
    router := gin.Default()

    // --- 加入這段 CORS 設定 ---
    router.Use(cors.New(cors.Config{
        AllowOrigins:     []string{"http://localhost:3000"}, // 允許前端的網址
        AllowMethods:     []string{"GET", "POST", "PUT", "DELETE"},
        AllowHeaders:     []string{"Origin", "Content-Type"},
        ExposeHeaders:    []string{"Content-Length"},
        AllowCredentials: true,
        MaxAge:           12 * time.Hour,
    }))
    // ------------------------

    routes.UserRoute(router)
    router.Run(":8080")
}