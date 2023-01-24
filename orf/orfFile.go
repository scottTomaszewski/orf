package orf

import (
	"encoding/json"
	"fmt"
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
		return nil, fmt.Errorf("failed to load orf file at %s: %w\n", relativeFilePath, err)
	}
	return orf, nil
}

func FromAllFilesIn(relativeDirPath string) (*ORFFile, error) {
	composed := ORFFile{
		Formulas:  Formulas{},
		Variables: make(map[string]interface{}),
	}

	err := filepath.Walk(relativeDirPath,
		func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}
			if info.IsDir() {
				return nil
			}
			fmt.Printf("Loading orf data from %s\n", path)
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
	merge(other.Variables, o.Variables)
}

func merge(src map[string]interface{}, dest map[string]interface{}) {
	for k, v := range src {
		switch v.(type) {
		case map[string]interface{}:
			if destVal, ok := dest[k]; ok {
				merge(v.(map[string]interface{}), destVal.(map[string]interface{}))
			} else {
				dest[k] = v
			}
		default:
			dest[k] = v
		}
	}
}

// TODO - try to delete this?
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
