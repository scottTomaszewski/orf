package orf

import (
	"encoding/json"
	"io/ioutil"
)

type ORFData struct {
	Formulas
	Variables map[string]interface{} `json:"variables"`
}

type Formulas struct {
	Formulas []DependentFormula `json:"formulas"`
}

type DependentFormula struct {
	Formula
	Dependencies []string `json:"dependencies,omitempty"`
}

type Formula struct {
	Ref        string `json:"ref"`
	Type       string `json:"type"`
	Expression string `json:"expression"`
}

func FromFile(relativeFilePath string) (*ORFData, error) {
	orfBytes, err := ioutil.ReadFile(relativeFilePath)
	if err != nil {
		return nil, err
	}

	orf := &ORFData{}
	err = json.Unmarshal(orfBytes, orf)
	if err != nil {
		return nil, err
	}
	return orf, nil
}
