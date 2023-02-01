package engine

import (
	"fmt"
	"orf/evaluate"
	"orf/functions"
	"orf/orf"
	"orf/util"
)

type ContextAsFormulas struct {
	formulas         []orf.DependentFormula
	refToFormula     map[string]orf.DependentFormula
	formulaHierarchy util.NestedMap
}

func From(source orf.ORFFile) *ContextAsFormulas {
	allFormulas := make([]orf.DependentFormula, 0)
	refToFormula := make(map[string]orf.DependentFormula, 0)
	formulaHierarchy := util.NestedMap{Variables: make(map[string]interface{})}

	for _, formula := range source.Formulas.Formulas {
		refToFormula[formula.Ref] = formula
		allFormulas = append(allFormulas, formula)
		formulaHierarchy.Put(formula.Ref, formula)
	}

	// kinda cheating here, but whatever
	flattened := make(map[string]interface{})
	util.Flatten("", source.Variables, flattened)

	for k, v := range flattened {
		value := v
		switch v.(type) {
		case string:
			value = fmt.Sprintf("\"%s\"", v)
		}
		depForm := orf.DependentFormula{
			Formula: orf.Formula{
				Ref:        k,
				Expression: fmt.Sprintf("%v", value),
			},
			Dependencies: nil,
		}
		allFormulas = append(allFormulas, depForm)
		refToFormula[k] = depForm
		formulaHierarchy.Put(k, depForm)
	}

	return &ContextAsFormulas{
		formulas:         allFormulas,
		refToFormula:     refToFormula,
		formulaHierarchy: formulaHierarchy,
	}
}

func (f *ContextAsFormulas) FindAllMatching(wildcardPath string) []interface{} {
	return f.formulaHierarchy.GetAll(wildcardPath)
}

func (f *ContextAsFormulas) evaluate(evaluator evaluate.GoValEvaluator) (*orf.CharacterContext, error) {

	orderedFormulaRefs, err := orderTopologically(*f)
	if err != nil {
		fmt.Printf("Failed to topologically sort: %s", err)
		return nil, fmt.Errorf("failed to topologically sort: %w", err)
	}

	context := orf.CharacterContext{Variables: make(map[string]interface{}, 0)}

	for _, ref := range orderedFormulaRefs {
		err := evaluator.Evaluate(f.refToFormula[ref].Formula, context, functions.GetFunctions(context))
		if err != nil {
			return nil, err
		}
	}

	return &context, nil
}

func (f *ContextAsFormulas) Print() {
	fmt.Println(f.refToFormula)
}
