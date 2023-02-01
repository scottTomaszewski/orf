package log

import (
	"strings"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// Zap LogIdentifier
const Zap LoggerImpl = 1

type zapLogger struct {
	level zap.AtomicLevel
	l     *zap.SugaredLogger
}

func (z *zapLogger) Debug(args ...interface{}) {
	z.l.Debug(args...)
}

func (z *zapLogger) Debugf(format string, args ...interface{}) {
	z.l.Debugf(format, args...)
}

func (z *zapLogger) Info(args ...interface{}) {
	z.l.Info(args...)
}

func (z *zapLogger) Infof(format string, args ...interface{}) {
	z.l.Infof(format, args...)
}

func (z *zapLogger) Warn(args ...interface{}) {
	z.l.Warn(args...)
}

func (z *zapLogger) Warnf(format string, args ...interface{}) {
	z.l.Warnf(format, args...)
}

func (z *zapLogger) Error(args ...interface{}) {
	z.l.Error(args...)
}

func (z *zapLogger) Errorf(format string, args ...interface{}) {
	z.l.Errorf(format, args...)
}

func (z *zapLogger) Fatal(args ...interface{}) {
	z.l.Fatal(args...)
}

func (z *zapLogger) WithFields(keyValues Fields) Logger {
	var zapFields = make([]interface{}, 0)
	for k, v := range keyValues {
		zapFields = append(zapFields, k)
		zapFields = append(zapFields, v)
	}

	fieldLogger := z.l.With(zapFields...)
	return &zapLogger{level: z.level, l: fieldLogger}
}

func (z *zapLogger) WithOptions(keyValues Options) Logger {
	if ops := zapCustomOps(loggerCfg, keyValues); len(ops) > 0 {
		baseLogger := z.l.Desugar()
		newLoggerWithOptions := baseLogger.WithOptions(ops...)

		return &zapLogger{level: z.level, l: newLoggerWithOptions.Sugar()}
	}
	return z
}

func (z *zapLogger) Level() Level {
	return levelFromZapLevel(z.level.Level())
}

func (z *zapLogger) SetLevel(level Level) {
	z.level.SetLevel(zapLevel(level))
}

func newZapLogger(cfg Config) Logger {
	enc := zapEncoder(cfg.Format)
	level := zap.NewAtomicLevelAt(zapLevel(cfg.Level))
	customOps := Options{"addCallerSkip": 1}

	logger := zap.New(zapcore.NewCore(
		enc,
		cfg.Out,
		level,
	), zapCustomOps(cfg, customOps)...)

	sugar := logger.Sugar()

	return &zapLogger{level: level, l: sugar}
}

// zapCustomOps returns a list of custom zap options that can be passed into newZapLogger
func zapCustomOps(cfg Config, keyValues Options) []zap.Option {
	level := zap.NewAtomicLevelAt(zapLevel(cfg.Level))
	var ops []zap.Option

	//there is a pretty big performance cost of adding the caller info to the log message
	//lets disable it unless we are in debug
	if level.Level() < zap.InfoLevel {
		if addCallerSkip, ok := keyValues["addCallerSkip"]; ok {
			if skipToInt, ok := addCallerSkip.(int); ok {
				ops = append(ops, zap.AddCaller(), zap.AddCallerSkip(skipToInt))
			}
		}
	}
	return ops
}

func zapLevel(l Level) zapcore.Level {
	switch l {
	case LevelDebug:
		return zap.DebugLevel
	case LevelWarn:
		return zap.WarnLevel
	case LevelInfo:
		return zap.InfoLevel
	default:
		return zap.ErrorLevel
	}
}

func levelFromZapLevel(zl zapcore.Level) Level {
	switch zl {
	case zap.DebugLevel:
		return LevelDebug
	case zap.WarnLevel:
		return LevelWarn
	case zap.InfoLevel:
		return LevelInfo
	case zap.ErrorLevel:
		return LevelError
	default:
		return LevelNone
	}
}

func zapEncoder(format string) zapcore.Encoder {
	ec := zap.NewProductionEncoderConfig()
	ec.EncodeDuration = zapcore.NanosDurationEncoder
	ec.EncodeLevel = zapcore.CapitalLevelEncoder
	ec.EncodeTime = nil
	//ec.EncodeTime = zapcore.ISO8601TimeEncoder

	if strings.ToUpper(format) == JSONFormat {
		return zapcore.NewJSONEncoder(ec)
	}

	return zapcore.NewConsoleEncoder(ec)
}
