package engine

import (
	"fmt"
	"orf/evaluate"
	"orf/functions"
	"orf/orf"
	"orf/util"
)

type ContextAsFormulas struct {
	// formulas slice of all values converted to orf.Formula
	formulas []orf.Formula

	// refToFormula flat map of reference paths to orf.Formula
	refToFormula map[string]orf.Formula

	// formulaHierarchy nested map of ref components with the leaves as orf.Formula
	formulaHierarchy util.NestedMap
}

func From(source orf.ORFFile) *ContextAsFormulas {
	allFormulas := make([]orf.Formula, 0)
	refToFormula := make(map[string]orf.Formula, 0)
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
		depForm := orf.Formula{
			ReferencedExpression: orf.ReferencedExpression{
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
		return nil, fmt.Errorf("failed to topologically sort: %w", err)
	}

	context := orf.CharacterContext{Variables: make(map[string]interface{}, 0)}

	for _, ref := range orderedFormulaRefs {
		err := evaluator.Evaluate(f.refToFormula[ref].ReferencedExpression, context, functions.GetFunctions(context))
		if err != nil {
			return nil, err
		}
	}

	return &context, nil
}

func (f *ContextAsFormulas) Print() {
	fmt.Println(f.refToFormula)
}
