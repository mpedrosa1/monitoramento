package domain

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PushToken struct {
	ID            primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	ColaboradorID primitive.ObjectID `json:"colaboradorId" bson:"colaboradorId"`
	Token         string             `json:"token" bson:"token"`
	Platform      string             `json:"platform" bson:"platform"`
	UpdatedAt     time.Time          `json:"updatedAt" bson:"updatedAt"`
}
