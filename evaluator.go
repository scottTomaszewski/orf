package main

import (
	"fmt"
	"github.com/heimdalr/dag"
	"github.com/maja42/goval"
)

type evaluatingVisitor struct {
	parameters map[string]interface{}
	functions  map[string]goval.ExpressionFunction
}

func (evaluator *evaluatingVisitor) Visit(v dag.Vertexer) {
	_, formulaVertex := v.Vertex()
	formula := formulaVertex.(Formula)

	err := evalFormulaGoVal(formula, evaluator.parameters, evaluator.functions)
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

func evalFormulaGoVal(formula Formula, parameters map[string]interface{}, functions map[string]goval.ExpressionFunction) error {
	eval := goval.NewEvaluator()
	result, err := eval.Evaluate(formula.Expression, parameters, functions) // Returns <true, nil>
	if err != nil {
		return err
	}

	err = insertAtPath(formula.Ref, result, parameters)
	if err != nil {
		return err
	}
	return nil
}
