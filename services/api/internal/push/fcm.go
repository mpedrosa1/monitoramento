package push

import (
	"context"
	"fmt"
	"log"
	"os"
	"sync"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/messaging"
	"github.com/mmrtec/monitoramento/api/internal/domain"
	"google.golang.org/api/option"
)

const androidChannelID = "mmrtec-alerts"

var (
	fcmMu     sync.Mutex
	fcmClient *messaging.Client
	fcmPath   string
)

// ConfigureFCM define o caminho do JSON da service account do Firebase (FCM v1).
func ConfigureFCM(credentialsFile string) {
	fcmMu.Lock()
	defer fcmMu.Unlock()
	fcmPath = credentialsFile
	fcmClient = nil
}

func fcmEnabled() bool {
	fcmMu.Lock()
	defer fcmMu.Unlock()
	return fcmPath != ""
}

func getFCMClient(ctx context.Context) (*messaging.Client, error) {
	fcmMu.Lock()
	defer fcmMu.Unlock()
	if fcmClient != nil {
		return fcmClient, nil
	}
	if fcmPath == "" {
		return nil, fmt.Errorf("FCM_CREDENTIALS_FILE não configurado")
	}
	if _, err := os.Stat(fcmPath); err != nil {
		return nil, fmt.Errorf("FCM credentials: %w", err)
	}
	app, err := firebase.NewApp(ctx, nil, option.WithCredentialsFile(fcmPath))
	if err != nil {
		return nil, err
	}
	client, err := app.Messaging(ctx)
	if err != nil {
		return nil, err
	}
	fcmClient = client
	return client, nil
}

// SendMobile envia push para tokens registrados (FCM no Android, Expo no iOS).
func SendMobile(ctx context.Context, tokens []domain.PushToken, title, body string, data map[string]string) {
	if len(tokens) == 0 {
		return
	}

	var fcmTokens []string
	var expoTokens []string
	for _, t := range tokens {
		if routePushToken(t.Platform, t.Token) {
			fcmTokens = append(fcmTokens, t.Token)
		} else {
			expoTokens = append(expoTokens, t.Token)
		}
	}

	if len(fcmTokens) > 0 {
		if err := sendFCM(ctx, fcmTokens, title, body, data); err != nil {
			log.Printf("push fcm: %v", err)
		}
	}
	if len(expoTokens) > 0 {
		if err := SendExpo(ctx, expoTokens, title, body, data); err != nil {
			log.Printf("push expo: %v", err)
		}
	}
}

func sendFCM(ctx context.Context, tokens []string, title, body string, data map[string]string) error {
	if !fcmEnabled() {
		return fmt.Errorf("FCM não configurado — defina FCM_CREDENTIALS_FILE na API")
	}
	client, err := getFCMClient(ctx)
	if err != nil {
		return err
	}

	for _, token := range tokens {
		if token == "" {
			continue
		}
		msg := &messaging.Message{
			Token: token,
			Notification: &messaging.Notification{
				Title: title,
				Body:  body,
			},
			Data: data,
			Android: &messaging.AndroidConfig{
				Priority: "high",
				Notification: &messaging.AndroidNotification{
					ChannelID:              androidChannelID,
					Priority:               messaging.PriorityHigh,
					DefaultSound:           true,
					DefaultVibrateTimings:  true,
					Visibility:             messaging.VisibilityPublic,
				},
			},
		}
		if _, err := client.Send(ctx, msg); err != nil {
			log.Printf("push fcm token: %v", err)
		}
	}
	return nil
}
