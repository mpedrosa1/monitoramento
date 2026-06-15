package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port              string
	MongoURI          string
	MongoDatabase     string
	CORSOrigins       []string
	CollectorEnabled  bool
	PingIntervalSec   int
	ModbusIntervalSec int
	ModbusTimeoutMs   int
	ModbusReadDelayMs int
	SNMPIntervalSec   int
	JWTSecret         string
	JWTExpiry         time.Duration
	FCMCredentialsFile string
}

func Load() Config {
	hours := getEnvInt("JWT_EXPIRY_HOURS", 8)
	if hours <= 0 {
		hours = 8
	}
	return Config{
		Port:              getEnv("PORT", "8081"),
		MongoURI:          os.Getenv("MONGODB_URI"),
		MongoDatabase:     getEnv("MONGODB_DATABASE", "monitoramento"),
		CORSOrigins:       splitCSV(getEnv("CORS_ORIGINS", "http://localhost:3000")),
		CollectorEnabled:  getEnvBool("COLLECTOR_ENABLED", true),
		PingIntervalSec:   getEnvInt("PING_INTERVAL_SEC", 5),
		ModbusIntervalSec: getEnvInt("MODBUS_INTERVAL_SEC", 10),
		ModbusTimeoutMs:   getEnvInt("MODBUS_TIMEOUT_MS", 8000),
		ModbusReadDelayMs: getEnvInt("MODBUS_READ_DELAY_MS", 50),
		SNMPIntervalSec:   getEnvInt("SNMP_INTERVAL_SEC", 30),
		JWTSecret:         getEnv("JWT_SECRET", "dev-mmrtec-altere-em-producao"),
		JWTExpiry:         time.Duration(hours) * time.Hour,
		FCMCredentialsFile: getEnv("FCM_CREDENTIALS_FILE", ""),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	return v == "1" || strings.EqualFold(v, "true")
}

func getEnvInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func splitCSV(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}
