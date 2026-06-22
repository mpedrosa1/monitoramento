package domain

// VeiculoProximidadeRaioKm raio padrão para alerta de chegada à unidade.
const VeiculoProximidadeRaioKm = 5.0

// VeiculoProximidadeAlerta evento de entrada no raio de uma unidade.
type VeiculoProximidadeAlerta struct {
	VeiculoID   string  `json:"veiculoId"`
	Placa       string  `json:"placa"`
	UnidadeID   string  `json:"unidadeId"`
	UnidadeNome string  `json:"unidadeNome"`
	DistanciaKm float64 `json:"distanciaKm"`
	RaioKm      float64 `json:"raioKm"`
}

// VeiculoPosicao representa a última posição GPS de um veículo da frota.
type VeiculoPosicao struct {
	VeiculoID    string  `json:"veiculoId"`
	Placa        string  `json:"placa"`
	Lat          float64 `json:"lat"`
	Lng          float64 `json:"lng"`
	VelocidadeKm float64 `json:"velocidadeKm,omitempty"`
	OdometroKm   float64 `json:"odometroKm,omitempty"`
	DataHora     string  `json:"dataHora,omitempty"`
	Endereco     string  `json:"endereco,omitempty"`
}
