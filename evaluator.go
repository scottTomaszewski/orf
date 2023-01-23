package main

import (
	"fmt"
	"github.com/heimdalr/dag"
	"github.com/maja42/goval"
	"orf/orf"
)

type evaluatingVisitor struct {
	context   characterContext
	functions map[string]goval.ExpressionFunction
}

func (evaluator *evaluatingVisitor) Visit(v dag.Vertexer) {
	_, formulaVertex := v.Vertex()
	formula := formulaVertex.(orf.Formula)

	err := evaluate(formula, evaluator.context, evaluator.functions)
	if err != nil {
		fmt.Printf("Failed to eval formula %s: %s\n", formula.Ref, err)
		return
	}
	_, err = evaluator.context.Get(formula.Ref)
	if err != nil {
		fmt.Printf("Failed to find value for %s: %s\n", formula.Ref, err)
		return
	}
}

func evaluate(
	formula orf.Formula,
	context characterContext,
	functions map[string]goval.ExpressionFunction) error {
	//fmt.Printf("[DEBUG] Evaluating %s\n", formula.Ref)
	fmt.Printf("	%s", formula.Ref)
	eval := goval.NewEvaluator()
	result, err := eval.Evaluate(formula.Expression, context.variables, functions) // Returns <true, nil>
	if err != nil {
		return err
	}

	err = context.Put(formula.Ref, result)
	if err != nil {
		return err
	}
	fmt.Printf(" = %v\n", result)
	return nil
}

func evaluateAll(
	orderedFormulaRefs []string,
	formulas FormulaData,
	context characterContext,
	functions map[string]goval.ExpressionFunction) error {

	for _, ref := range orderedFormulaRefs {
		err := evaluate(formulas.refToFormula[ref].Formula, context, functions)
		if err != nil {
			return err
		}
	}
	return nil
}
