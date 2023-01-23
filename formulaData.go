package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"orf/orf"
	"os"
	"path/filepath"
	"strings"
)

type FormulaData struct {
	formulas     []orf.DependentFormula
	refToFormula map[string]orf.DependentFormula
}

func loadData(characterFile string, formulaRootDir string) (*FormulaData, error) {
	formulas, err := loadFormulas(characterFile)
	if err != nil {
		return nil, fmt.Errorf("failed to load formulas from %s: %s", characterFile, err)
	}

	var allFormulas = make([]orf.DependentFormula, 0)
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

	var refToFormula = make(map[string]orf.DependentFormula, 0)
	for _, formula := range allFormulas {
		refToFormula[formula.Ref] = formula
	}

	data := FormulaData{
		formulas:     allFormulas,
		refToFormula: refToFormula,
	}
	return &data, nil
}

func loadFormulas(filePath string) (*orf.Formulas, error) {
	formulaBytes, err := ioutil.ReadFile(filePath)
	if err != nil {
		return nil, err
	}

	formulas := &orf.Formulas{}
	err = json.Unmarshal(formulaBytes, formulas)
	if err != nil {
		return nil, err
	}
	return formulas, nil
}

func (f *FormulaData) GetAllMatchingWildcard(dotSeparatedPath string) []orf.DependentFormula {
	path := strings.Replace(dotSeparatedPath, ".*", "", -1)
	matches := make([]orf.DependentFormula, 0)
	for id, formula := range f.refToFormula {
		if strings.HasPrefix(id, path) {
			matches = append(matches, formula)
		}
	}
	return matches
}
