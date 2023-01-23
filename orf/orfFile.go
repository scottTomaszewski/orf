package orf

import (
	"encoding/json"
	"fmt"
	"golang.org/x/exp/maps"
	"io/ioutil"
	"os"
	"path/filepath"
)

type ORFFile struct {
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
	Expression string `json:"expression"`
}

func FromFile(relativeFilePath string) (*ORFFile, error) {
	orfBytes, err := ioutil.ReadFile(relativeFilePath)
	if err != nil {
		return nil, err
	}

	orf := &ORFFile{}
	err = json.Unmarshal(orfBytes, orf)
	if err != nil {
		return nil, err
	}
	return orf, nil
}

func FromAllFilesIn(relativeDirPath string) (*ORFFile, error) {
	composed := ORFFile{
		Formulas:  Formulas{},
		Variables: nil,
	}

	err := filepath.Walk(relativeDirPath,
		func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}
			if info.IsDir() {
				return nil
			}
			fmt.Printf("Loading orf files at %s\n", path)
			orfFile, err := FromFile(path)
			if err != nil {
				return fmt.Errorf("failed to load formulas from %s: %s", path, err)
			}
			composed.Upsert(orfFile)
			return nil
		})
	if err != nil {
		return nil, fmt.Errorf("failed to load formulas: %s", err)
	}
	return &composed, nil
}

func (o *ORFFile) Upsert(other *ORFFile) {
	o.Formulas.Formulas = append(o.Formulas.Formulas, other.Formulas.Formulas...)
	maps.Copy(o.Variables, other.Variables)
}

// Note: this iterates over the entire formula slice - it is NOT efficient
func (o *ORFFile) allAsRefToDepFormula() map[string]DependentFormula {
	var refToFormula = make(map[string]DependentFormula, 0)
	for _, formula := range o.Formulas.Formulas {
		refToFormula[formula.Ref] = formula
	}

	// kinda cheating here, but whatever
	flattened := make(map[string]interface{})
	Flatten("", o.Variables, flattened)
	for k, v := range flattened {
		refToFormula[k] = DependentFormula{
			Formula: Formula{
				Ref:        k,
				Expression: fmt.Sprintf("%v", v),
			},
			Dependencies: nil,
		}
	}

	return refToFormula
}
