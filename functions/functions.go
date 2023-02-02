package functions

import (
	"errors"
	"fmt"
	"github.com/maja42/goval"
	"math"
	"orf/orf"
)

func GetFunctions(context orf.CharacterContext) map[string]goval.ExpressionFunction {
	return map[string]goval.ExpressionFunction{
		"sum":        sum,
		"max":        max,
		"getFromAll": getFromAll,
	}
}

func sum(args ...interface{}) (interface{}, error) {
	switch args[0].(type) {
	case map[string]interface{}:
		// assuming a map of base types
		return sumAll(args[0].(map[string]interface{}))
	case []interface{}:
		// nested array
		summation := 0
		for i := range args {
			nestedSlice := args[i].([]interface{})
			for j := range nestedSlice {
				sum, err := sum(nestedSlice[j])
				if err != nil {
					return nil, err
				}
				summation += sum.(int)
			}
		}
		return summation, nil
	default:
		// assuming base types
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
	switch args[0].(type) {
	case map[string]interface{}:
		// assuming a map of base types
		return maxValue(args[0].(map[string]interface{}))
	case []interface{}:
		return nil, fmt.Errorf("max function of an array is not yet supported")
	default:
		// assume
		return maxInt(args)
	}
}

func maxInt(args []interface{}) (interface{}, error) {
	max := math.MinInt
	for i := range args {
		value := args[i].(int)
		if value > max {
			max = value
		}
	}
	if max == math.MinInt {
		return nil, errors.New("arguments dont have a max")
	}
	return max, nil
}

func maxValue(args map[string]interface{}) (interface{}, error) {
	max := math.MinInt
	for _, v := range args {
		value := v.(int)
		if value > max {
			max = value
		}
	}
	if max == math.MinInt {
		return nil, errors.New("arguments dont have a max")
	}
	return max, nil
}

func getFromAll(args ...interface{}) (interface{}, error) {
	switch args[0].(type) {
	case map[string]interface{}:
		switch args[1].(type) {
		case string:
			return getFromAll_(args[0].(map[string]interface{}), args[1].(string))
		}
	}
	return nil, errors.New("unrecognized types for get")
}

// Usage: getAllFrom(foo, "baz")
// If input has `foo.bar.baz=1` and `foo.nargles.baz=2`, this will return `[1, 2]`
func getFromAll_(nonLeaf map[string]interface{}, key string) (interface{}, error) {
	values := make([]interface{}, 0)
	for _, v := range nonLeaf {
		actual := v.(map[string]interface{})
		values = append(values, actual[key])
	}
	return values, nil
}
