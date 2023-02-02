package evaluate

import (
	"github.com/maja42/goval"
	"orf/log"
	"orf/orf"
)

type Evaluator interface {
	EvaluateAndPersist(formula orf.ReferencedExpression, context orf.CharacterContext, functions map[string]goval.ExpressionFunction) error
}

type GoValEvaluator struct {
	actual *goval.Evaluator
}

func Init() GoValEvaluator {
	eval := goval.NewEvaluator()
	return GoValEvaluator{actual: eval}
}

func (e *GoValEvaluator) EvaluateAndPersist(
	formula orf.ReferencedExpression,
	context orf.CharacterContext,
	functions map[string]goval.ExpressionFunction) error {

	//log.Debugf("evaluating %s", formula.Ref)
	result, err := e.actual.Evaluate(formula.Expression, context.Variables, functions) // Returns <true, nil>
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

func (e *GoValEvaluator) EvaluateBoolean(
	expression string,
	variables map[string]interface{},
	functions map[string]goval.ExpressionFunction) (bool, error) {
	result, err := e.actual.Evaluate(expression, variables, functions)
	if err != nil {
		return false, err
	}
	return result.(bool), nil
}
