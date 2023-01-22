package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
)

type FormulaData struct {
	formulas     []DependentFormula
	refToFormula map[string]DependentFormula
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

type Formulas struct {
	Formulas []DependentFormula `json:"formulas"`
}

func loadData(characterFile string, formulaRootDir string) (*FormulaData, error) {
	formulas, err := loadFormulas(characterFile)
	if err != nil {
		return nil, fmt.Errorf("failed to load formulas from %s: %s", characterFile, err)
	}

	var allFormulas = make([]DependentFormula, 0)
	allFormulas = append(allFormulas, formulas.Formulas...)

	err = filepath.Walk(formulaRootDir,
		func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}
			if info.IsDir() {
				return nil
			}
			fmt.Printf("Loading formulas at %s\n", path)
			formulas, err := loadFormulas(path)
			if err != nil {
				return fmt.Errorf("failed to load formulas from %s: %s", path, err)
			}
			allFormulas = append(allFormulas, formulas.Formulas...)
			return nil
		})
	if err != nil {
		return nil, fmt.Errorf("failed to load formulas: %s", err)
	}

	var refToFormula = make(map[string]DependentFormula, 0)
	for _, formula := range allFormulas {
		refToFormula[formula.Ref] = formula
	}

	data := FormulaData{
		formulas:     allFormulas,
		refToFormula: refToFormula,
	}
	return &data, nil
}

func loadFormulas(filePath string) (*Formulas, error) {
	formulaBytes, err := ioutil.ReadFile(filePath)
	if err != nil {
		return nil, err
	}

	formulas := &Formulas{}
	err = json.Unmarshal(formulaBytes, formulas)
	if err != nil {
		return nil, err
	}
	return formulas, nil
}
