package rotaexata

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

type Config struct {
	BaseURL      string
	Email        string
	Password     string
	TokenExpires int
}

func (c Config) Enabled() bool {
	return strings.TrimSpace(c.BaseURL) != "" &&
		strings.TrimSpace(c.Email) != "" &&
		strings.TrimSpace(c.Password) != ""
}

type Client struct {
	cfg    Config
	http   *http.Client
	mu     sync.Mutex
	token  string
	expiry time.Time

	motoristasMu       sync.RWMutex
	motoristasCache    []Usuario
	motoristasCachedAt time.Time
}

func NewClient(cfg Config) *Client {
	return &Client{
		cfg: cfg,
		http: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// DiagnoseResult resume login e leitura de posições (sem expor o token).
type DiagnoseResult struct {
	LoginOK          bool   `json:"loginOk"`
	LoginError       string `json:"loginError,omitempty"`
	TokenLength      int    `json:"tokenLength,omitempty"`
	PosicoesAPI      int    `json:"posicoesApi"`
	PosicoesParseadas int   `json:"posicoesParseadas"`
}

func (c *Client) Diagnose(ctx context.Context) DiagnoseResult {
	out := DiagnoseResult{}
	token, err := c.ensureToken(ctx)
	if err != nil {
		out.LoginError = err.Error()
		return out
	}
	out.LoginOK = true
	out.TokenLength = len(token)

	body, err := c.getRaw(ctx, "/ultima-posicao/todos")
	if err != nil {
		out.LoginError = "posições: " + err.Error()
		return out
	}
	records, err := extractRecords(body)
	if err != nil {
		out.LoginError = "parse: " + err.Error()
		return out
	}
	out.PosicoesAPI = len(records)
	for _, rec := range records {
		if _, ok := parsePosicao(rec); ok {
			out.PosicoesParseadas++
		}
	}
	return out
}

func (c *Client) UltimaPosicaoTodos(ctx context.Context) ([]ParsedPosicao, error) {
	body, err := c.get(ctx, "/ultima-posicao/todos")
	if err != nil {
		return nil, err
	}
	records, err := extractRecords(body)
	if err != nil {
		return nil, err
	}
	out := make([]ParsedPosicao, 0, len(records))
	for _, rec := range records {
		if p, ok := parsePosicao(rec); ok {
			out = append(out, p)
		}
	}
	return out, nil
}

// PreviewAdesao busca dados da adesão (inclui odômetro cadastrado).
func (c *Client) PreviewAdesao(ctx context.Context, adesaoID int) (json.RawMessage, error) {
	return c.get(ctx, fmt.Sprintf("/adesoes/%d", adesaoID))
}

// PreviewResumoDia retorna resumo do dia (km, última posição).
func (c *Client) PreviewResumoDia(ctx context.Context, adesaoID int, data string) (json.RawMessage, error) {
	return c.get(ctx, fmt.Sprintf("/resumo-dia/%d/%s", adesaoID, data))
}

// PreviewUltimaPosicao retorna o JSON bruto (para diagnóstico de formato).
func (c *Client) PreviewUltimaPosicao(ctx context.Context) (json.RawMessage, error) {
	body, err := c.get(ctx, "/ultima-posicao/todos")
	if err != nil {
		return nil, err
	}
	var pretty json.RawMessage
	if err := json.Unmarshal(body, &pretty); err != nil {
		return body, nil
	}
	return pretty, nil
}

func (c *Client) get(ctx context.Context, path string) ([]byte, error) {
	return c.getRaw(ctx, path)
}

func (c *Client) getRaw(ctx context.Context, path string) ([]byte, error) {
	return c.doRequest(ctx, http.MethodGet, path, nil)
}

// ProbeGET executa GET e devolve corpo mesmo em HTTP de erro (diagnóstico).
func (c *Client) ProbeGET(ctx context.Context, path string) ([]byte, error) {
	token, err := c.ensureToken(ctx)
	if err != nil {
		return nil, err
	}
	url := strings.TrimRight(c.cfg.BaseURL, "/") + path
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", token)
	req.Header.Set("Accept", "application/json")
	res, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(io.LimitReader(res.Body, 8<<20))
	if err != nil {
		return nil, err
	}
	if res.StatusCode == http.StatusUnauthorized {
		c.invalidateToken()
		return body, fmt.Errorf("HTTP %d", res.StatusCode)
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return body, fmt.Errorf("HTTP %d: %s", res.StatusCode, truncate(string(body), 120))
	}
	return body, nil
}

func (c *Client) post(ctx context.Context, path string, payload any) ([]byte, error) {
	return c.doRequest(ctx, http.MethodPost, path, payload)
}

func (c *Client) put(ctx context.Context, path string, payload any) ([]byte, error) {
	return c.doRequest(ctx, http.MethodPut, path, payload)
}

// ProbePOST executa POST e devolve corpo mesmo em erro (diagnóstico).
func (c *Client) ProbePOST(ctx context.Context, path string, payload any) ([]byte, error) {
	token, err := c.ensureToken(ctx)
	if err != nil {
		return nil, err
	}
	var bodyReader io.Reader
	if payload != nil {
		raw, err := json.Marshal(payload)
		if err != nil {
			return nil, err
		}
		bodyReader = bytes.NewReader(raw)
	}
	url := strings.TrimRight(c.cfg.BaseURL, "/") + path
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bodyReader)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", token)
	req.Header.Set("Accept", "application/json")
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	res, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(io.LimitReader(res.Body, 8<<20))
	if err != nil {
		return nil, err
	}
	if res.StatusCode == http.StatusUnauthorized {
		c.invalidateToken()
		return body, fmt.Errorf("HTTP %d", res.StatusCode)
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return body, fmt.Errorf("HTTP %d: %s", res.StatusCode, truncate(string(body), 200))
	}
	return body, nil
}

func (c *Client) doRequest(ctx context.Context, method, path string, payload any) ([]byte, error) {
	token, err := c.ensureToken(ctx)
	if err != nil {
		return nil, err
	}
	var bodyReader io.Reader
	if payload != nil {
		raw, err := json.Marshal(payload)
		if err != nil {
			return nil, err
		}
		bodyReader = bytes.NewReader(raw)
	}
	url := strings.TrimRight(c.cfg.BaseURL, "/") + path
	req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", token)
	req.Header.Set("Accept", "application/json")
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	res, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(io.LimitReader(res.Body, 8<<20))
	if err != nil {
		return nil, err
	}
	if res.StatusCode == http.StatusUnauthorized {
		c.invalidateToken()
		return nil, fmt.Errorf("rota exata: não autorizado")
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, fmt.Errorf("rota exata: HTTP %d: %s", res.StatusCode, truncate(string(body), 200))
	}
	return body, nil
}

func (c *Client) ensureToken(ctx context.Context) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.token != "" && time.Now().Before(c.expiry) {
		return c.token, nil
	}
	expires := c.cfg.TokenExpires
	if expires <= 0 {
		expires = 86400
	}
	payload := map[string]any{
		"email":    c.cfg.Email,
		"password": c.cfg.Password,
		"expires":  expires,
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	url := strings.TrimRight(c.cfg.BaseURL, "/") + "/login"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(raw))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	res, err := c.http.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if err != nil {
		return "", err
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		msg := truncate(string(body), 200)
		if strings.Contains(strings.ToLower(msg), "<!doctype") || strings.Contains(strings.ToLower(msg), "<html") {
			return "", fmt.Errorf("rota exata login: HTTP %d — resposta HTML (verifique ROTAEXATA_BASE_URL: use https://api.rotaexata.com.br ou https://api-dev.rotaexata.com.br, não o site www)", res.StatusCode)
		}
		return "", fmt.Errorf("rota exata login: HTTP %d: %s", res.StatusCode, msg)
	}
	token := extractToken(body)
	if token == "" {
		return "", fmt.Errorf("rota exata login: token não encontrado na resposta (HTTP %d, corpo %d bytes)", res.StatusCode, len(body))
	}
	c.token = token
	c.expiry = time.Now().Add(time.Duration(expires-120) * time.Second)
	return c.token, nil
}

func (c *Client) invalidateToken() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.token = ""
	c.expiry = time.Time{}
}

func truncate(s string, max int) string {
	s = strings.TrimSpace(s)
	if len(s) <= max {
		return s
	}
	return s[:max] + "…"
}
