package main

import (
	"fmt"
	"orf/evaluate"
	"orf/orf"
	"strings"
)

type ContextAsFormulas struct {
	formulas     []orf.DependentFormula
	refToFormula map[string]orf.DependentFormula
}

func From(source orf.ORFFile) *ContextAsFormulas {
	allFormulas := make([]orf.DependentFormula, 0)
	refToFormula := make(map[string]orf.DependentFormula, 0)

	for _, formula := range source.Formulas.Formulas {
		refToFormula[formula.Ref] = formula
		allFormulas = append(allFormulas, formula)
	}

	// kinda cheating here, but whatever
	flattened := make(map[string]interface{})
	orf.Flatten("", source.Variables, flattened)

	for k, v := range flattened {
		depForm := orf.DependentFormula{
			Formula: orf.Formula{
				Ref:        k,
				Expression: fmt.Sprintf("%v", v),
			},
			Dependencies: nil,
		}
		refToFormula[k] = depForm

		allFormulas = append(allFormulas, depForm)
	}

	return &ContextAsFormulas{
		formulas:     allFormulas,
		refToFormula: refToFormula,
	}
}

func (f *ContextAsFormulas) GetAllMatchingWildcard(dotSeparatedPath string) []orf.DependentFormula {
	path := strings.Replace(dotSeparatedPath, ".*", "", -1)
	matches := make([]orf.DependentFormula, 0)
	for id, formula := range f.refToFormula {
		if strings.HasPrefix(id, path) {
			matches = append(matches, formula)
		}
	}
	return matches
}

func (f *ContextAsFormulas) evaluate(evaluator evaluate.GoValEvaluator) (*orf.CharacterContext, error) {

	orderedFormulaRefs, err := orderTopologically(*f)
	if err != nil {
		fmt.Printf("Failed to topologically sort: %s", err)
		return nil, fmt.Errorf("failed to topologically sort: %w", err)
	}

	context := orf.CharacterContext{Variables: make(map[string]interface{}, 0)}

	for _, ref := range orderedFormulaRefs {
		err := evaluator.Evaluate(f.refToFormula[ref].Formula, context, GetFunctions(context))
		if err != nil {
			return nil, err
		}
	}

	return &context, nil

	//err = evaluate.evaluateAll(orderedFormulaRefs, *formulas, context, GetFunctions(context))
	//if err != nil {
	//	fmt.Printf("Failed to evaluate formulas: %s", err)
	//	return
	//}
}
