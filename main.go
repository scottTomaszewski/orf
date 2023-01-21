package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/heimdalr/dag"
	"github.com/maja42/goval"
	"io/ioutil"
	"strings"
)

func main() {
	formulaFiles := []string{"bob.json", "ability_modifiers.json", "character_formulas.json"}
	var allFormulas = make([]DependentFormula, 0)

	for i := range formulaFiles {
		formulas, err := loadFormulas(formulaFiles[i])
		if err != nil {
			fmt.Printf("Failed to load formulas from %s: %s", formulaFiles[i], err)
			return
		}
		allFormulas = append(allFormulas, formulas.Formulas...)
	}

	fmt.Printf("Building DAG\n")
	formulaDAG := dag.NewDAG()

	// Add formula Vertices
	for formulaIndex := range allFormulas {
		formula := allFormulas[formulaIndex]
		err := formulaDAG.AddVertexByID(formula.Ref, formula.Formula)
		if err != nil {
			fmt.Printf("Failed to add formula %s to DAG: %s", formula.Ref, err)
			return
		}
	}

	// Add formula dependencies (needs all vertices before we can do this)
	for formulaIndex := range allFormulas {
		formula := allFormulas[formulaIndex]
		for depIndex := range formula.Dependencies {
			err := formulaDAG.AddEdge(formula.Dependencies[depIndex], formula.Ref)
			if err != nil {
				fmt.Printf("Failed to add formula dependency from  %s to %s: %s", formula.Ref, formula.Dependencies[depIndex], err)
				return
			}
		}
	}

	//fmt.Print(formulaDAG.String())

	fmt.Printf("Evaluating formulas:\n")
	parameters := make(map[string]interface{}, 8)
	formulaDAG.BFSWalk(&evaluatingVisitor{parameters: parameters})

	marshal, err := json.MarshalIndent(parameters, "", "  ")
	if err != nil {
		return
	}
	fmt.Println(string(marshal))
}

type evaluatingVisitor struct {
	parameters map[string]interface{}
}

func (evaluator *evaluatingVisitor) Visit(v dag.Vertexer) {
	_, formulaVertex := v.Vertex()
	formula := formulaVertex.(Formula)

	err := evalFormulaGoVal(formula, evaluator.parameters)
	if err != nil {
		fmt.Printf("Failed to eval formula %s: %s\n", formula.Ref, err)
		return
	}
	value, err := getRefValue(formula.Ref, evaluator.parameters)
	if err != nil {
		fmt.Printf("Failed to find value for %s: %s\n", formula.Ref, err)
		return
	}
	fmt.Printf("	%s = %v\n", formula.Ref, value)
}

type Character struct {
	BaseValues map[string]interface{} `json:"base_values,omitempty"`
}

func loadCharacter(filePath string, parameters map[string]interface{}) error {
	characterBytes, err := ioutil.ReadFile(filePath)
	if err != nil {
		return err
	}

	var characterData Character
	err = json.Unmarshal(characterBytes, &characterData)
	if err != nil {
		return err
	}

	//var characterParams = make(map[string]interface{})
	fmt.Printf("Loading character data\n")

	for k, v := range characterData.BaseValues {
		fmt.Printf("	%s = %v\n", k, v)
		//characterParams[k] = v
		parameters[k] = v
	}
	//parameters["character"] = characterParams
	return nil
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

func evalFormulaGoVal(formula Formula, parameters map[string]interface{}) error {
	eval := goval.NewEvaluator()
	result, err := eval.Evaluate(formula.Expression, parameters, nil) // Returns <true, nil>
	if err != nil {
		return err
	}

	err = insertAtPath(formula.Ref, result, parameters)
	if err != nil {
		return err
	}
	//parameters[formula.Ref] = result
	return nil
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
