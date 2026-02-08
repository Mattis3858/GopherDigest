package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Article struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Title     string             `bson:"title" json:"title"`
	Content   string             `bson:"content" json:"content"` // 原始內容
	Summary   string             `bson:"summary" json:"summary"` // Ollama 生成的摘要
	Tags      []string           `bson:"tags" json:"tags"`       // Ollama 生成的標籤
	URL       string             `bson:"url" json:"url"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
}