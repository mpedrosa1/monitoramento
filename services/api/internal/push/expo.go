package push

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

const expoPushURL = "https://exp.host/--/api/v2/push/send"

type expoMessage struct {
	To        string            `json:"to"`
	Title     string            `json:"title"`
	Body      string            `json:"body"`
	Data      map[string]string `json:"data,omitempty"`
	Sound     string            `json:"sound,omitempty"`
	ChannelID string            `json:"channelId,omitempty"`
	Priority  string            `json:"priority,omitempty"`
}

// SendExpo entrega notificações via Expo Push (FCM/APNs no dispositivo).
func SendExpo(ctx context.Context, tokens []string, title, body string, data map[string]string) error {
	if len(tokens) == 0 {
		return nil
	}

	msgs := make([]expoMessage, 0, len(tokens))
	for _, token := range tokens {
		if token == "" {
			continue
		}
		msgs = append(msgs, expoMessage{
			To:        token,
			Title:     title,
			Body:      body,
			Data:      data,
			Sound:     "default",
			ChannelID: "mmrtec-alerts",
			Priority:  "high",
		})
	}
	if len(msgs) == 0 {
		return nil
	}

	const chunkSize = 100
	client := &http.Client{Timeout: 15 * time.Second}
	for i := 0; i < len(msgs); i += chunkSize {
		end := i + chunkSize
		if end > len(msgs) {
			end = len(msgs)
		}
		payload, err := json.Marshal(msgs[i:end])
		if err != nil {
			return err
		}
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, expoPushURL, bytes.NewReader(payload))
		if err != nil {
			return err
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Accept", "application/json")

		res, err := client.Do(req)
		if err != nil {
			return err
		}
		res.Body.Close()
		if res.StatusCode < 200 || res.StatusCode >= 300 {
			return fmt.Errorf("expo push: status %d", res.StatusCode)
		}
	}
	return nil
}
