package antenas

type Antena struct {
	ID           string  `json:"id"`
	NomeEntidade string  `json:"nomeEntidade"`
	Tecnologia   string  `json:"tecnologia"`
	Latitude     float64 `json:"latitude"`
	Longitude    float64 `json:"longitude"`
	Azimute      string  `json:"azimute,omitempty"`
	PotenciaW    string  `json:"potenciaW,omitempty"`
	AlturaAntena string  `json:"alturaAntena,omitempty"`
	Municipio    string  `json:"municipio"`
	NumEstacao   string  `json:"numEstacao"`
	DistanciaKm  float64 `json:"distanciaKm"`
}
