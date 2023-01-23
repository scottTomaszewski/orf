package main

import (
	"fmt"
	"github.com/heimdalr/dag"
	"github.com/maja42/goval"
	"orf/orf"
)

type evaluatingVisitor struct {
	context   orf.CharacterContext
	functions map[string]goval.ExpressionFunction
}

func (evaluator *evaluatingVisitor) Visit(v dag.Vertexer) {
	_, formulaVertex := v.Vertex()
	formula := formulaVertex.(orf.Formula)

	err := evaluate2(formula, evaluator.context, evaluator.functions)
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

func evaluate2(
	formula orf.Formula,
	context orf.CharacterContext,
	functions map[string]goval.ExpressionFunction) error {
	fmt.Printf("	%s", formula.Ref)
	eval := goval.NewEvaluator()
	result, err := eval.Evaluate(formula.Expression, context.Variables, functions) // Returns <true, nil>
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

func EvaluateAll(
	orderedFormulaRefs []string,
	formulas ContextAsFormulas,
	context orf.CharacterContext,
	functions map[string]goval.ExpressionFunction) error {

	for _, ref := range orderedFormulaRefs {
		err := evaluate2(formulas.refToFormula[ref].Formula, context, functions)
		if err != nil {
			return err
		}
	}
	return nil
}
