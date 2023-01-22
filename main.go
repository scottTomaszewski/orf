package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"strings"
)

func main() {
	formulaRootDir := "formulas"
	characterFile := "bob.json"

	formulas, err := loadData(characterFile, formulaRootDir)
	if err != nil {
		fmt.Printf("Failed to load formula data: %s", err)
	}

	orderedFormulas, err := buildAndSortTopologicalOrdering(*formulas)
	if err != nil {
		fmt.Printf("Failed to topologically sort: %s", err)
	}

	parameters := make(map[string]interface{}, 0)

	err = evaluateAll(orderedFormulas, *formulas, parameters, GetFunctions(parameters))
	if err != nil {
		fmt.Printf("Failed to evaluate formulas: %s", err)
		return
	}

	//parameters, err := HeimdalrDagEvaluate(allFormulas)
	//if err != nil {
	//	fmt.Printf("Failed to evaluate usng Heimdalr DAG evaluation: %s", err)
	//}

	marshal, err := json.MarshalIndent(parameters, "", "  ")
	if err != nil {
		return
	}
	fmt.Println(string(marshal))
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

// Creates parents along the way
func insertAtPath(dotSeparatedPath string, value interface{}, m map[string]interface{}) error {
	pathComponents := strings.Split(dotSeparatedPath, ".")
	if 1 == len(pathComponents) {
		m[pathComponents[0]] = value
	} else {
		if _, ok := m[pathComponents[0]]; !ok {
			m[pathComponents[0]] = make(map[string]interface{})
		}
		err := insertAtPath(strings.Join(pathComponents[1:], "."), value, m[pathComponents[0]].(map[string]interface{}))
		if err != nil {
			return err
		}
	}
	return nil
}

func getRefValue(dotSeparatedPath string, m map[string]interface{}) (interface{}, error) {
	pathComponents := strings.Split(dotSeparatedPath, ".")
	if _, ok := m[pathComponents[0]]; !ok {
		return nil, errors.New(fmt.Sprintf("Failed to find path %s in map", dotSeparatedPath))
	}
	if 1 == len(pathComponents) {
		return m[pathComponents[0]], nil
	} else {
		return getRefValue(strings.Join(pathComponents[1:], "."), m[pathComponents[0]].(map[string]interface{}))
	}
}
