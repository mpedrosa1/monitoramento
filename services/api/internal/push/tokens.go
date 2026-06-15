package push

import "strings"

func isExpoPushToken(token string) bool {
	return strings.HasPrefix(token, "ExponentPushToken[") ||
		strings.HasPrefix(token, "ExpoPushToken[")
}

func routePushToken(platform, token string) (fcm bool) {
	if isExpoPushToken(token) {
		return false
	}
	switch platform {
	case "android":
		return true
	case "ios":
		return false
	default:
		return len(token) > 0 && token[0] != 'E'
	}
}
