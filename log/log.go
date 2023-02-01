package log

import (
	"io"
	"os"
)

// Initialize loggers in case InitFromConfig has not been called before Logger is attempted to be used
func init() {
	InitFromConfig(Config{
		Level:  LevelInfo,
		Format: ConsoleFormat,
		Type:   Zap,
		Out:    os.Stdout,
	})
}

// Level of logging
type Level int8

func (l Level) String() string {
	switch l {
	case LevelDebug:
		return "DEBUG"
	case LevelInfo:
		return "INFO"
	case LevelWarn:
		return "WARN"
	case LevelError:
		return "ERROR"
	default:
		return "NONE"
	}
}

// LoggerImpl type
type LoggerImpl int8

const (
	//JSONFormat const to represent JSON output in log
	JSONFormat = "JSON"
	//ConsoleFormat const to represent stdout output in log
	ConsoleFormat = "Console"
)

type SyncWriter interface {
	io.Writer
	Sync() error
}

// Config log configuration
type Config struct {
	Level  Level
	Format string
	Type   LoggerImpl
	Out    SyncWriter
}

const (
	//LevelNone constant value for setting log level to off
	LevelNone Level = iota
	//LevelDebug constant value for setting log level to debug
	LevelDebug
	//LevelInfo constant value for setting log level to info
	LevelInfo
	//LevelWarn constant value for setting log level to warn
	LevelWarn
	//LevelError constant value for setting log level to error
	LevelError
)

var logger Logger
var wrappedLogger Logger
var loggerCfg Config

// Fields Type to pass when we want to call WithFields for structured logging
type Fields map[string]interface{}
type Options map[string]interface{}

// Logger interface used to wrap log implementations
type Logger interface {
	Debug(args ...interface{})
	Debugf(format string, args ...interface{})
	Info(args ...interface{})
	Infof(format string, args ...interface{})
	Warn(args ...interface{})
	Warnf(format string, args ...interface{})
	Error(args ...interface{})
	Errorf(format string, args ...interface{})
	Fatal(args ...interface{})
	WithFields(keyValues Fields) Logger
	WithOptions(keyValues Options) Logger
	Level() Level
}

type SetLeveler interface {
	SetLevel(Level)
}

func SetLevel(level Level) {
	if lvl, ok := wrappedLogger.(SetLeveler); ok {
		lvl.SetLevel(level)
	}
}

func GetLevel() Level {
	return wrappedLogger.Level()
}

// Debug output log in debug level
func Debug(args ...interface{}) {
	wrappedLogger.Debug(args...)
}

// Debugf output log formatted msg in debug mode
func Debugf(format string, args ...interface{}) {
	wrappedLogger.Debugf(format, args...)
}

// Info logs output log in info level
func Info(args ...interface{}) {
	wrappedLogger.Info(args...)
}

// Infof outputs log formatted msg in info mode
func Infof(format string, args ...interface{}) {
	wrappedLogger.Infof(format, args...)
}

// Warn outputs log in warn level
func Warn(args ...interface{}) {
	wrappedLogger.Warn(args...)
}

// Warnf outputs log formatted msg in warn mode
func Warnf(format string, args ...interface{}) {
	wrappedLogger.Warnf(format, args...)
}

// Error outputs log in error level
func Error(args ...interface{}) {
	wrappedLogger.Error(args...)
}

// Errorf outputs log formatted msg in error mode
func Errorf(format string, args ...interface{}) {
	wrappedLogger.Errorf(format, args...)
}

func Fatal(args ...interface{}) {
	wrappedLogger.Fatal(args...)
}

func WithFields(fields Fields) Logger {
	return logger.WithFields(fields)
}

func WithOptions(options Options) Logger {
	return logger.WithOptions(options)
}

// GetBaseLogger returns the configured global logger
func GetBaseLogger() Logger {
	return logger
}

// InitFromConfig sets the logger type via config
func InitFromConfig(cfg Config) {
	loggerCfg = cfg

	switch loggerCfg.Type {
	case Zap:
		logger = newZapLogger(loggerCfg)
		wrappedLogger = logger.WithOptions(Options{"addCallerSkip": 2})
	default:
		// default to zap for now
		logger = newZapLogger(loggerCfg)
		wrappedLogger = logger.WithOptions(Options{"addCallerSkip": 2})
	}
}
