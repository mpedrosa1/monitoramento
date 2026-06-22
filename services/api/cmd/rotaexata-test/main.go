// Comando de diagnóstico: testa login e leitura de posições na Rota Exata.
// Uso (na raiz do monorepo ou em services/api):
//
//	go run ./cmd/rotaexata-test
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/mmrtec/monitoramento/api/internal/config"
	"github.com/mmrtec/monitoramento/api/internal/rotaexata"
)

func main() {
	config.LoadEnvFiles()
	cfg := config.Load()

	rx := rotaexata.Config{
		BaseURL:      cfg.RotaExataBaseURL,
		Email:        cfg.RotaExataEmail,
		Password:     cfg.RotaExataPassword,
		TokenExpires: 86400,
	}

	fmt.Println("=== Teste Rota Exata ===")
	fmt.Printf("Base URL: %q\n", rx.BaseURL)
	fmt.Printf("E-mail configurado: %v\n", rx.Email != "")
	fmt.Printf("Senha configurada: %v (tamanho %d caracteres)\n", rx.Password != "", len(rx.Password))

	if !rx.Enabled() {
		fmt.Println("\n❌ Variáveis incompletas. Defina ROTAEXATA_BASE_URL, ROTAEXATA_EMAIL e ROTAEXATA_PASSWORD no .env")
		os.Exit(1)
	}

	client := rotaexata.NewClient(rx)
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()

	result := client.Diagnose(ctx)
	raw, _ := json.MarshalIndent(result, "", "  ")
	fmt.Println("\nResultado:")
	fmt.Println(string(raw))

	if !result.LoginOK {
		fmt.Println("\n❌ Login falhou. Verifique credenciais e se a senha com # está entre aspas no .env")
		os.Exit(1)
	}

	fmt.Printf("\n✅ Login OK (token com %d caracteres)\n", result.TokenLength)
	fmt.Printf("   Posições na API: %d | parseadas com lat/lng/placa: %d\n", result.PosicoesAPI, result.PosicoesParseadas)
	if result.PosicoesParseadas > 0 {
		list, err := client.UltimaPosicaoTodos(ctx)
		if err == nil && len(list) > 0 {
			fmt.Printf("   Amostra odômetro parseado (1º veículo): %.3f km (placa %s)\n", list[0].OdometroKm, list[0].Placa)
		}
		if preview, err := client.PreviewUltimaPosicao(ctx); err == nil {
			var top struct {
				Data []struct {
					Posicao struct {
						OdometroGPS        float64 `json:"odometro_gps"`
						OdometroOriginal   float64 `json:"odometro_original"`
						OdometroCalculado  float64 `json:"odometro_calculado"`
						Adesao             map[string]any `json:"adesao"`
					} `json:"posicao"`
				} `json:"data"`
			}
			if json.Unmarshal(preview, &top) == nil && len(top.Data) > 0 {
				p := top.Data[0].Posicao
				fmt.Printf("   odometro_gps bruto: %.0f | odometro_original: %.0f | odometro_calculado: %.0f\n", p.OdometroGPS, p.OdometroOriginal, p.OdometroCalculado)
				if p.Adesao != nil {
					if id, ok := p.Adesao["id"].(float64); ok {
						if adesaoJSON, err := client.PreviewAdesao(ctx, int(id)); err == nil {
							var rows []map[string]any
							if json.Unmarshal(adesaoJSON, &rows) == nil && len(rows) > 0 {
								for _, k := range []string{"odometro_adesao", "odometro", "odometro_gps", "km_atual"} {
									if v, ok := rows[0][k]; ok {
										fmt.Printf("   adesao.%s: %v\n", k, v)
									}
								}
							}
						}
						today := time.Now().Format("2006-01-02")
						if resumo, err := client.PreviewResumoDia(ctx, int(id), today); err == nil {
							var resumoObj map[string]any
							if json.Unmarshal(resumo, &resumoObj) == nil {
								printJSONKeys(resumoObj, "resumo", 0)
							}
						}
					}
				}
			}
		}
	}
	if result.PosicoesParseadas == 0 && result.PosicoesAPI > 0 {
		fmt.Println("   ⚠ A API retornou registros, mas nenhum com lat/lng/placa reconhecíveis — pode ser formato diferente.")
		if preview, err := client.PreviewUltimaPosicao(ctx); err == nil {
			trimmed := string(preview)
			if len(trimmed) > 1200 {
				trimmed = trimmed[:1200] + "…"
			}
			fmt.Println("\n   Amostra da resposta (primeiros ~1200 chars):")
			fmt.Println(trimmed)
		}
	}
}

func printJSONKeys(v any, prefix string, depth int) {
	if depth > 4 {
		return
	}
	m, ok := v.(map[string]any)
	if !ok {
		return
	}
	for k, val := range m {
		full := prefix + "." + k
		if strings.Contains(strings.ToLower(k), "odomet") || strings.Contains(strings.ToLower(k), "km") {
			fmt.Printf("   %s: %v\n", full, val)
		}
		printJSONKeys(val, full, depth+1)
	}
}
