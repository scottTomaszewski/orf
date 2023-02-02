package evaluate

import (
	"github.com/maja42/goval"
	"orf/log"
	"orf/orf"
)

type Evaluator interface {
	Evaluate(formula orf.ReferencedExpression, context orf.CharacterContext, functions map[string]goval.ExpressionFunction) error
}

type GoValEvaluator struct{}

func (e *GoValEvaluator) Evaluate(
	formula orf.ReferencedExpression,
	context orf.CharacterContext,
	functions map[string]goval.ExpressionFunction) error {
	//log.Debugf("evaluating %s", formula.Ref)
	eval := goval.NewEvaluator()
	result, err := eval.Evaluate(formula.Expression, context.Variables, functions) // Returns <true, nil>
	if err != nil {
		return err
	}

	err = context.Put(formula.Ref, result)
	if err != nil {
		return err
	}
	log.Debugf("%s = %v", formula.Ref, result)
	return nil
}
