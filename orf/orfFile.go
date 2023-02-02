package orf

import (
	"encoding/json"
	"fmt"
	"gopkg.in/yaml.v3"
	"orf/log"
	"os"
	"path/filepath"
	"strings"
)

type ORFFile struct {
	Formulas  `yaml:",inline"`
	Variables map[string]interface{} `json:"variables" yaml:"variables"`
}

type Formulas struct {
	Formulas []Formula `json:"formulas" yaml:"formulas,flow"`
}

type Formula struct {
	ReferencedExpression `yaml:",inline"`

	//Dependencies slice of ReferencedExpression.Ref that need to be evaluated before this Formula
	Dependencies []string `json:"dependencies,omitempty" yaml:"dependencies,omitempty"`

	//Conditions slice of maja42/goval expressions that all must evaluate to true in order to eval this Formula
	Conditions []string `json:"conditions,omitempty" yaml:"conditions,omitempty"`
}

type ReferencedExpression struct {
	//Ref dot-separated components of a "path" in nested json
	Ref string `json:"ref" yaml:"ref"`

	//Expression maja42/goval expression
	Expression string `json:"expression" yaml:"expression"`
}

func FromJsonFile(relativeFilePath string) (*ORFFile, error) {
	orfBytes, err := os.ReadFile(relativeFilePath)
	if err != nil {
		return nil, err
	}

	orf := &ORFFile{}
	err = json.Unmarshal(orfBytes, orf)
	if err != nil {
		return nil, fmt.Errorf("failed to load json orf file at %s: %w\n", relativeFilePath, err)
	}
	return orf, nil
}

func FromYamlFile(relativeFilePath string) (*ORFFile, error) {
	orfBytes, err := os.ReadFile(relativeFilePath)
	if err != nil {
		return nil, err
	}

	orf := &ORFFile{}
	err = yaml.Unmarshal(orfBytes, orf)
	if err != nil {
		return nil, fmt.Errorf("failed to load yaml orf file at %s: %w\n", relativeFilePath, err)
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
			log.Debugf("Loading orf data from %s", path)
			if strings.HasSuffix(path, "json") {
				orfFile, err := FromJsonFile(path)
				if err != nil {
					return fmt.Errorf("failed to load formulas from %s: %s", path, err)
				}
				composed.Upsert(orfFile)
			} else if strings.HasSuffix(path, "yml") || strings.HasSuffix(path, "yaml") {
				orfFile, err := FromYamlFile(path)
				if err != nil {
					return fmt.Errorf("failed to load formulas from %s: %s", path, err)
				}
				composed.Upsert(orfFile)
			}
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

func (df Formula) String() string {
	return fmt.Sprintf("{Formula form='%s', deps=%s}", df.ReferencedExpression, df.Dependencies)
}

func (f ReferencedExpression) String() string {
	return fmt.Sprintf("{ReferencedExpression ref='%s', expr='%s'}", f.Ref, f.Expression)
}

// TODO - try to delete this?
// Note: this iterates over the entire formula slice - it is NOT efficient
func (o *ORFFile) allAsRefToDepFormula() map[string]Formula {
	var refToFormula = make(map[string]Formula, 0)
	for _, formula := range o.Formulas.Formulas {
		refToFormula[formula.Ref] = formula
	}

	// kinda cheating here, but whatever
	flattened := make(map[string]interface{})
	Flatten("", o.Variables, flattened)
	for k, v := range flattened {
		refToFormula[k] = Formula{
			ReferencedExpression: ReferencedExpression{
				Ref:        k,
				Expression: fmt.Sprintf("%v", v),
			},
			Dependencies: nil,
		}
	}

	return refToFormula
}
