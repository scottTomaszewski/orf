package main

import (
	"errors"
	"github.com/maja42/goval"
)

func GetFunctions(variables map[string]interface{}) map[string]goval.ExpressionFunction {
	return map[string]goval.ExpressionFunction{
		"sum": sum,
		"max": max,

		//"allVars": func(args ...interface{}) (interface{}, error) {
		//	return allVars(args[0].(string), variables)
		//},
		"sumAll": func(args ...interface{}) (interface{}, error) {
			return sumAll(args[0].(map[string]interface{}))
		},
	}
}

func sum(args ...interface{}) (interface{}, error) {
	sum := 0
	for i := range args {
		sum += args[i].(int)
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

//func allVars(paramExpression string, variables map[string]interface{}) (interface{}, error) {
//	pathComponents := strings.Split(paramExpression, ".")
//
//	//// handle wildcard at the end of the expression
//	//if pathComponents[0] == "*" {
//	//	values := make([]interface{}, 0, len(variables))
//	//	for value, _ := range variables {
//	//		values = append(values, value)
//	//	}
//	//	return values, nil
//	//}
//	//
//	//// TODO - handle wildcard in middle
//
//	if _, ok := variables[pathComponents[0]]; !ok {
//		return nil, errors.New(fmt.Sprintf("Failed to find path %s in map", paramExpression))
//	}
//	if 1 == len(pathComponents) {
//		return variables[pathComponents[0]], nil
//	} else {
//		path := strings.Join(pathComponents[1:], ".")
//		varTree := variables[pathComponents[0]].(map[string]interface{})
//		return allVars(path, varTree)
//	}
//}

func sumAll(toSum map[string]interface{}) (interface{}, error) {
	sum := 0
	for i := range toSum {
		sum += toSum[i].(int)
	}
	return sum, nil
}

//func sumAllOld(paramExpression string, variables map[string]interface{}) (interface{}, error) {
//	varsTemp, err := allVars(paramExpression, variables)
//	vars := varsTemp.(map[string]interface{})
//	if err != nil {
//		return nil, err
//	}
//	sum := 0
//	for i := range vars {
//		sum += vars[i].(int)
//	}
//	return sum, nil
//}
