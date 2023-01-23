package evaluate

import (
	"fmt"
	"github.com/maja42/goval"
	"orf/orf"
)

type Evaluator interface {
	Evaluate(formula orf.Formula, context orf.CharacterContext, functions map[string]goval.ExpressionFunction) error
}

type GoValEvaluator struct{}

func (e *GoValEvaluator) Evaluate(
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
