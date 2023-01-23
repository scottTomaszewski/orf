package functions

import (
	"errors"
	"github.com/maja42/goval"
	"orf/orf"
)

func GetFunctions(context orf.CharacterContext) map[string]goval.ExpressionFunction {
	return map[string]goval.ExpressionFunction{
		"sum": sum,
		"max": max,
	}
}

func sum(args ...interface{}) (interface{}, error) {
	switch args[0].(type) {
	case map[string]interface{}:
		return sumAll(args[0].(map[string]interface{}))
	default:
		sum := 0
		for i := range args {
			sum += args[i].(int)
		}
		return sum, nil
	}
}

func sumAll(toSum map[string]interface{}) (interface{}, error) {
	sum := 0
	for i := range toSum {
		sum += toSum[i].(int)
	}
	return sum, nil
}

func max(args ...interface{}) (interface{}, error) {
	max := -99999999999999
	for i := range args {
		value := args[i].(int)
		if value > max {
			max = value
		}
	}
	if max == -99999999999999 {
		return nil, errors.New("arguments dont have a max")
	}
	return max, nil
}
