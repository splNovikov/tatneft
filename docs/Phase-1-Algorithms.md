# ЭТАП 1: ДЕТАЛЬНОЕ ОПИСАНИЕ АЛГОРИТМОВ

**Версия:** 1.0  
**Дата:** 2025  
**Статус:** Проектирование

---

## Оглавление

1. [Алгоритм анализа давления в емкости](#алгоритм-анализа-давления-в-емкости)
2. [Алгоритм анализа давления на приеме насоса](#алгоритм-анализа-давления-на-приеме-насоса)
3. [Алгоритм анализа давления на выкиде насоса](#алгоритм-анализа-давления-на-выкиде-насоса)
4. [Алгоритм выявления ложных сигналов](#алгоритм-выявления-ложных-сигналов)
5. [Алгоритм проверки соответствия уставок](#алгоритм-проверки-соответствия-уставок)
6. [Алгоритм анализа объемов перекачки](#алгоритм-анализа-объемов-перекачки)
7. [Алгоритм классификации тревог](#алгоритм-классификации-тревог)
8. [Алгоритм генерации рекомендаций](#алгоритм-генерации-рекомендаций)

---

## Алгоритм анализа давления в емкости

### Входные данные

```python
{
    "object_id": "uuid",
    "equipment_id": "uuid",  # ID емкости
    "parameter_id": "uuid",  # ID параметра "Давление в емкости"
    "period_start": "2025-07-01",
    "period_end": "2025-08-31",
    "current_month": "2025-08"
}
```

### Шаг 1: Загрузка данных давления

```python
def load_pressure_data(parameter_id, period_start, period_end):
    """
    Загружает данные давления за указанный период
    """
    query = """
        SELECT time, value, quality
        FROM time_series_data
        WHERE parameter_id = %s
          AND time >= %s
          AND time < %s
          AND quality > 50  -- Только валидные данные
        ORDER BY time
    """
    return execute_query(query, [parameter_id, period_start, period_end])
```

**Результат:** Массив значений давления с временными метками

### Шаг 2: Загрузка данных уровня в емкости

```python
def load_level_data(object_id, period_start, period_end):
    """
    Загружает данные уровня в емкости
    """
    # Находим параметр уровня для этой емкости
    level_param = find_parameter(object_id, equipment_id, "level")
    
    query = """
        SELECT time, value, quality
        FROM time_series_data
        WHERE parameter_id = %s
          AND time >= %s
          AND time < %s
          AND quality > 50
        ORDER BY time
    """
    return execute_query(query, [level_param.id, period_start, period_end])
```

**Результат:** Массив значений уровня с временными метками

### Шаг 3: Расчет статистики за текущий месяц

```python
def calculate_monthly_statistics(data, month_start, month_end):
    """
    Рассчитывает статистические показатели за месяц
    """
    month_data = [d for d in data if month_start <= d.time < month_end]
    
    if not month_data:
        return None
    
    values = [d.value for d in month_data if d.value is not None]
    
    if not values:
        return None
    
    return {
        "avg": statistics.mean(values),
        "min": min(values),
        "max": max(values),
        "median": statistics.median(values),
        "std_dev": statistics.stdev(values) if len(values) > 1 else 0,
        "count": len(values),
        "range": max(values) - min(values)
    }
```

**Результат:**
```python
{
    "avg": 0.08,  # МПа
    "min": -0.07,
    "max": 0.09,
    "median": 0.08,
    "std_dev": 0.03,
    "count": 2880,  # Количество измерений
    "range": 0.16
}
```

### Шаг 4: Расчет статистики за предыдущий месяц

```python
def calculate_previous_month_statistics(data, current_month):
    """
    Рассчитывает статистику за предыдущий месяц
    """
    prev_month_start = current_month - timedelta(days=current_month.day)
    prev_month_end = current_month
    
    return calculate_monthly_statistics(data, prev_month_start, prev_month_end)
```

**Результат:** Аналогичная структура или `None`, если данных нет

### Шаг 5: Сравнение периодов

```python
def compare_periods(current_stats, previous_stats):
    """
    Сравнивает статистику текущего и предыдущего периодов
    """
    if not previous_stats:
        return {
            "comparison": "no_previous_data",
            "change_percent": None
        }
    
    if previous_stats["avg"] == 0:
        return {
            "comparison": "previous_zero",
            "change_percent": None
        }
    
    change_percent = ((current_stats["avg"] - previous_stats["avg"]) / 
                      abs(previous_stats["avg"])) * 100
    
    return {
        "comparison": "compared",
        "change_percent": round(change_percent, 2),
        "change_absolute": current_stats["avg"] - previous_stats["avg"],
        "trend": "increasing" if change_percent > 5 else 
                 "decreasing" if change_percent < -5 else "stable"
    }
```

**Результат:**
```python
{
    "comparison": "compared",
    "change_percent": 3.0,  # Рост на 3%
    "change_absolute": 0.01,
    "trend": "stable"
}
```

### Шаг 6: Проверка состояния емкости

```python
def check_equipment_status(level_data, pressure_data):
    """
    Определяет состояние емкости на основе уровня и давления
    """
    if not level_data:
        return {
            "status": "unknown",
            "reason": "no_level_data"
        }
    
    recent_levels = [d.value for d in level_data[-100:] if d.value is not None]
    
    if not recent_levels:
        return {
            "status": "unknown",
            "reason": "no_valid_level_data"
        }
    
    avg_level = statistics.mean(recent_levels)
    min_level = min(recent_levels)
    max_level = max(recent_levels)
    
    # Если уровень постоянно ниже 0, емкость не в эксплуатации
    if max_level < 0:
        return {
            "status": "decommissioned",
            "reason": "level_below_zero",
            "avg_level": avg_level
        }
    
    # Если уровень стабилен на минимальном значении
    if max_level - min_level < 0.1 and avg_level < 0.5:
        return {
            "status": "possibly_decommissioned",
            "reason": "stable_low_level",
            "avg_level": avg_level
        }
    
    # Если давление постоянно на нуле или отрицательное
    if pressure_data:
        recent_pressures = [d.value for d in pressure_data[-100:] if d.value is not None]
        if recent_pressures:
            avg_pressure = statistics.mean(recent_pressures)
            if avg_pressure <= 0 and max(recent_pressures) < 0.01:
                return {
                    "status": "possibly_decommissioned",
                    "reason": "zero_pressure",
                    "avg_pressure": avg_pressure
                }
    
    return {
        "status": "operational",
        "reason": "normal_operation",
        "avg_level": avg_level
    }
```

**Результат:**
```python
{
    "status": "decommissioned",
    "reason": "level_below_zero",
    "avg_level": -0.2
}
```

### Шаг 7: Проверка допустимых параметров

```python
def check_equipment_limits(equipment_id):
    """
    Проверяет допустимые параметры оборудования
    """
    equipment = get_equipment(equipment_id)
    
    # Проверка срока эксплуатации
    expiration_info = None
    if equipment.expiration_date:
        if equipment.expiration_date < date.today():
            expiration_info = {
                "expired": True,
                "expiration_date": equipment.expiration_date,
                "years_overdue": (date.today() - equipment.expiration_date).days / 365
            }
        else:
            expiration_info = {
                "expired": False,
                "expiration_date": equipment.expiration_date,
                "days_remaining": (equipment.expiration_date - date.today()).days
            }
    
    # Паспортные данные
    limits = {
        "max_pressure": equipment.max_pressure,
        "min_pressure": equipment.min_pressure,
        "max_level": equipment.max_level if hasattr(equipment, 'max_level') else None,
        "min_level": equipment.min_level if hasattr(equipment, 'min_level') else None
    }
    
    return {
        "expiration": expiration_info,
        "limits": limits
    }
```

**Результат:**
```python
{
    "expiration": {
        "expired": True,
        "expiration_date": "2021-12-31",
        "years_overdue": 3.8
    },
    "limits": {
        "max_pressure": 0.6,  # МПа
        "min_pressure": 0.0
    }
}
```

### Шаг 8: Формирование результатов анализа

```python
def analyze_tank_pressure(object_id, equipment_id, parameter_id, 
                          period_start, period_end, current_month):
    """
    Основная функция анализа давления в емкости
    """
    # Загрузка данных
    pressure_data = load_pressure_data(parameter_id, period_start, period_end)
    level_data = load_level_data(object_id, period_start, period_end)
    
    # Расчет статистики
    current_stats = calculate_monthly_statistics(
        pressure_data, 
        current_month, 
        current_month + timedelta(days=32)
    )
    previous_stats = calculate_previous_month_statistics(
        pressure_data, 
        current_month
    )
    
    # Сравнение периодов
    comparison = compare_periods(current_stats, previous_stats)
    
    # Проверка состояния
    status = check_equipment_status(level_data, pressure_data)
    
    # Проверка допустимых параметров
    limits = check_equipment_limits(equipment_id)
    
    return {
        "parameter_id": parameter_id,
        "equipment_id": equipment_id,
        "analysis_date": date.today(),
        "current_month_stats": current_stats,
        "previous_month_stats": previous_stats,
        "comparison": comparison,
        "equipment_status": status,
        "equipment_limits": limits,
        "data_quality": {
            "pressure_points": len(pressure_data),
            "level_points": len(level_data),
            "coverage_percent": calculate_coverage(pressure_data, period_start, period_end)
        }
    }
```

### Пример результата

```python
{
    "parameter_id": "uuid-123",
    "equipment_id": "uuid-456",
    "analysis_date": "2025-08-15",
    "current_month_stats": {
        "avg": 0.08,
        "min": -0.07,
        "max": 0.09,
        "median": 0.08,
        "std_dev": 0.03,
        "count": 2880,
        "range": 0.16
    },
    "previous_month_stats": None,
    "comparison": {
        "comparison": "no_previous_data",
        "change_percent": None
    },
    "equipment_status": {
        "status": "decommissioned",
        "reason": "level_below_zero",
        "avg_level": -0.2
    },
    "equipment_limits": {
        "expiration": {
            "expired": True,
            "expiration_date": "2021-12-31",
            "years_overdue": 3.8
        },
        "limits": {
            "max_pressure": 0.6,
            "min_pressure": 0.0
        }
    },
    "data_quality": {
        "pressure_points": 5760,
        "level_points": 5760,
        "coverage_percent": 95.5
    }
}
```

---

## Алгоритм анализа давления на приеме насоса

### Входные данные

```python
{
    "object_id": "uuid",
    "equipment_id": "uuid",  # ID насоса
    "parameter_id": "uuid",  # ID параметра "Давление на приеме"
    "tank_parameter_id": "uuid",  # ID параметра "Давление в емкости"
    "period_start": "2025-07-01",
    "period_end": "2025-08-31",
    "current_month": "2025-08"
}
```

### Шаг 1: Загрузка данных давления на приеме

Аналогично алгоритму для емкости

### Шаг 2: Загрузка данных состояния насоса

```python
def load_pump_status(equipment_id, period_start, period_end):
    """
    Загружает данные о состоянии насоса (работает/остановлен)
    """
    # Находим параметр состояния насоса
    status_param = find_parameter(object_id, equipment_id, "pump_status")
    
    query = """
        SELECT time, value
        FROM time_series_data
        WHERE parameter_id = %s
          AND time >= %s
          AND time < %s
        ORDER BY time
    """
    return execute_query(query, [status_param.id, period_start, period_end])
```

**Результат:** Массив значений состояния (0 = остановлен, 1 = работает)

### Шаг 3: Загрузка данных давления в емкости

Для корреляционного анализа

### Шаг 4: Загрузка данных объемов перекачки

```python
def load_flow_volumes(object_id, period_start, period_end):
    """
    Загружает данные объемов перекачки из КИС «Армитс»
    """
    # Интеграция с КИС «Армитс»
    return armits_client.get_flow_volumes(object_id, period_start, period_end)
```

**Результат:**
```python
[
    {"date": "2025-08-01", "volume": 1006.0},  # м³/сут
    {"date": "2025-08-02", "volume": 1008.0},
    ...
]
```

### Шаг 5: Расчет статистики при работе насоса

```python
def calculate_pump_running_statistics(pressure_data, status_data):
    """
    Рассчитывает статистику давления только при работающем насосе
    """
    # Синхронизируем данные по времени
    running_pressures = []
    
    for pressure_point in pressure_data:
        # Находим ближайший статус насоса
        nearest_status = find_nearest_status(status_data, pressure_point.time)
        
        if nearest_status and nearest_status.value == 1:  # Насос работает
            running_pressures.append(pressure_point.value)
    
    if not running_pressures:
        return None
    
    return {
        "avg": statistics.mean(running_pressures),
        "min": min(running_pressures),
        "max": max(running_pressures),
        "median": statistics.median(running_pressures),
        "std_dev": statistics.stdev(running_pressures) if len(running_pressures) > 1 else 0,
        "count": len(running_pressures)
    }
```

**Результат:**
```python
{
    "avg": 0.34,  # МПа
    "min": 0.30,
    "max": 0.42,
    "median": 0.34,
    "std_dev": 0.02,
    "count": 1440
}
```

### Шаг 6: Анализ корреляции с давлением в емкости

```python
def analyze_pressure_correlation(pump_pressure_data, tank_pressure_data):
    """
    Анализирует корреляцию между давлением на приеме и давлением в емкости
    """
    # Синхронизируем данные по времени
    synchronized_data = synchronize_time_series(
        pump_pressure_data, 
        tank_pressure_data
    )
    
    if len(synchronized_data) < 10:
        return {
            "correlation": None,
            "reason": "insufficient_data"
        }
    
    pump_values = [d[0].value for d in synchronized_data]
    tank_values = [d[1].value for d in synchronized_data]
    
    # Расчет корреляции Пирсона
    correlation = statistics.correlation(pump_values, tank_values)
    
    # Расчет среднего перепада
    differences = [p - t for p, t in zip(pump_values, tank_values)]
    avg_difference = statistics.mean(differences)
    
    return {
        "correlation": round(correlation, 3),
        "avg_difference": round(avg_difference, 4),
        "interpretation": "strong" if abs(correlation) > 0.7 else 
                         "moderate" if abs(correlation) > 0.4 else "weak"
    }
```

**Результат:**
```python
{
    "correlation": 0.95,
    "avg_difference": 0.0,
    "interpretation": "strong"
}
```

### Шаг 7: Анализ корреляции с объемами перекачки

```python
def analyze_flow_correlation(pressure_data, flow_data):
    """
    Анализирует корреляцию между давлением и объемами перекачки
    """
    # Группируем давление по дням
    daily_pressures = group_by_day(pressure_data)
    
    # Синхронизируем с данными объемов
    synchronized = []
    for flow_point in flow_data:
        day_pressures = daily_pressures.get(flow_point.date)
        if day_pressures:
            avg_pressure = statistics.mean([p.value for p in day_pressures])
            synchronized.append((avg_pressure, flow_point.volume))
    
    if len(synchronized) < 5:
        return {
            "correlation": None,
            "reason": "insufficient_data"
        }
    
    pressures = [s[0] for s in synchronized]
    volumes = [s[1] for s in synchronized]
    
    correlation = statistics.correlation(pressures, volumes)
    
    return {
        "correlation": round(correlation, 3),
        "interpretation": "strong" if abs(correlation) > 0.7 else 
                         "moderate" if abs(correlation) > 0.4 else "weak"
    }
```

### Шаг 8: Анализ прогноза объемов

```python
def analyze_flow_forecast(object_id, current_month):
    """
    Анализирует прогноз объемов перекачки на следующий месяц
    """
    # Получаем прогноз из КИС «Армитс»
    forecast = armits_client.get_flow_forecast(object_id, current_month)
    
    # Получаем текущие объемы
    current_volumes = load_flow_volumes(
        object_id, 
        current_month, 
        current_month + timedelta(days=32)
    )
    
    if not current_volumes:
        return None
    
    current_avg = statistics.mean([v.volume for v in current_volumes])
    
    if forecast:
        forecast_avg = forecast.expected_volume
        change_percent = ((forecast_avg - current_avg) / current_avg) * 100
        
        return {
            "current_avg": current_avg,
            "forecast_avg": forecast_avg,
            "change_percent": round(change_percent, 2),
            "impact": "positive" if change_percent > 10 else 
                     "negative" if change_percent < -10 else "neutral"
        }
    
    return None
```

**Результат:**
```python
{
    "current_avg": 1006.0,  # м³/сут
    "forecast_avg": 1209.0,
    "change_percent": 20.2,
    "impact": "positive"
}
```

### Шаг 9: Проверка допустимых параметров насоса

```python
def check_pump_limits(equipment_id):
    """
    Проверяет допустимые параметры насоса
    """
    equipment = get_equipment(equipment_id)
    
    # Получаем паспортные данные из 1С ТОиР
    passport_data = toir_client.get_equipment_passport(equipment.serial_number)
    
    return {
        "max_inlet_pressure": passport_data.max_inlet_pressure or equipment.max_pressure,
        "min_inlet_pressure": passport_data.min_inlet_pressure or 0.05,  # МПа
        "max_outlet_pressure": passport_data.max_outlet_pressure,
        "min_outlet_pressure": passport_data.min_outlet_pressure,
        "optimal_inlet_pressure": passport_data.optimal_inlet_pressure
    }
```

**Результат:**
```python
{
    "max_inlet_pressure": 0.6,  # МПа
    "min_inlet_pressure": 0.05,
    "max_outlet_pressure": 3.0,
    "min_outlet_pressure": 2.0,
    "optimal_inlet_pressure": 0.35
}
```

### Шаг 10: Формирование результатов анализа

```python
def analyze_pump_inlet_pressure(object_id, equipment_id, parameter_id,
                                tank_parameter_id, period_start, period_end,
                                current_month):
    """
    Основная функция анализа давления на приеме насоса
    """
    # Загрузка данных
    pressure_data = load_pressure_data(parameter_id, period_start, period_end)
    status_data = load_pump_status(equipment_id, period_start, period_end)
    tank_pressure_data = load_pressure_data(tank_parameter_id, period_start, period_end)
    flow_data = load_flow_volumes(object_id, period_start, period_end)
    
    # Расчет статистики
    current_stats = calculate_monthly_statistics(pressure_data, current_month, 
                                                 current_month + timedelta(days=32))
    previous_stats = calculate_previous_month_statistics(pressure_data, current_month)
    running_stats = calculate_pump_running_statistics(pressure_data, status_data)
    
    # Анализ корреляций
    pressure_correlation = analyze_pressure_correlation(pressure_data, tank_pressure_data)
    flow_correlation = analyze_flow_correlation(pressure_data, flow_data)
    
    # Прогноз
    forecast = analyze_flow_forecast(object_id, current_month)
    
    # Проверка допустимых параметров
    limits = check_pump_limits(equipment_id)
    
    return {
        "parameter_id": parameter_id,
        "equipment_id": equipment_id,
        "analysis_date": date.today(),
        "current_month_stats": current_stats,
        "previous_month_stats": previous_stats,
        "running_stats": running_stats,
        "pressure_correlation": pressure_correlation,
        "flow_correlation": flow_correlation,
        "flow_forecast": forecast,
        "equipment_limits": limits
    }
```

---

## Алгоритм анализа давления на выкиде насоса

### Особенности алгоритма

1. **Проверка состояния насоса при сработке сигнала**
2. **Исключение сигналов при остановленном насосе**
3. **Проверка соответствия фактического давления допустимым параметрам**

### Шаг 1-3: Аналогично алгоритму для приемного давления

### Шаг 4: Анализ условий сработки сигнала

```python
def analyze_alarm_conditions(alarm_data, pressure_data, status_data):
    """
    Анализирует условия, при которых срабатывают сигналы
    """
    alarm_conditions = []
    
    for alarm in alarm_data:
        # Находим давление в момент сработки
        alarm_pressure = find_pressure_at_time(pressure_data, alarm.triggered_at)
        
        # Находим статус насоса в момент сработки
        alarm_status = find_status_at_time(status_data, alarm.triggered_at)
        
        # Анализируем давление до и после сработки
        before_pressure = get_pressure_before(pressure_data, alarm.triggered_at, minutes=5)
        after_pressure = get_pressure_after(pressure_data, alarm.triggered_at, minutes=5)
        
        condition = {
            "alarm_id": alarm.id,
            "triggered_at": alarm.triggered_at,
            "pressure_at_alarm": alarm_pressure,
            "pump_status": "running" if alarm_status == 1 else "stopped",
            "pressure_before": before_pressure.avg if before_pressure else None,
            "pressure_after": after_pressure.avg if after_pressure else None,
            "is_false_alarm": alarm_status == 0 and alarm.alarm_type in ["low", "alarm_low"]
        }
        
        alarm_conditions.append(condition)
    
    # Группировка по типам условий
    false_alarms = [c for c in alarm_conditions if c["is_false_alarm"]]
    real_alarms = [c for c in alarm_conditions if not c["is_false_alarm"]]
    
    return {
        "total_alarms": len(alarm_conditions),
        "false_alarms": len(false_alarms),
        "real_alarms": len(real_alarms),
        "false_alarm_percent": (len(false_alarms) / len(alarm_conditions) * 100) if alarm_conditions else 0,
        "conditions": alarm_conditions
    }
```

**Результат:**
```python
{
    "total_alarms": 147,
    "false_alarms": 147,
    "real_alarms": 0,
    "false_alarm_percent": 100.0,
    "conditions": [
        {
            "alarm_id": "uuid-1",
            "triggered_at": "2025-08-10 14:30:00",
            "pressure_at_alarm": 0.3,
            "pump_status": "stopped",
            "pressure_before": 2.0,
            "pressure_after": 0.3,
            "is_false_alarm": True
        },
        ...
    ]
}
```

### Шаг 5: Проверка соответствия фактического давления допустимым параметрам

```python
def check_pressure_vs_limits(running_stats, limits):
    """
    Проверяет соответствие фактического давления допустимым параметрам
    """
    issues = []
    
    if running_stats:
        # Проверка минимального давления
        if running_stats["avg"] < limits["min_outlet_pressure"]:
            issues.append({
                "type": "below_minimum",
                "parameter": "outlet_pressure",
                "actual": running_stats["avg"],
                "required": limits["min_outlet_pressure"],
                "deviation": limits["min_outlet_pressure"] - running_stats["avg"],
                "severity": "high"
            })
        
        # Проверка максимального давления
        if running_stats["max"] > limits["max_outlet_pressure"]:
            issues.append({
                "type": "above_maximum",
                "parameter": "outlet_pressure",
                "actual": running_stats["max"],
                "required": limits["max_outlet_pressure"],
                "deviation": running_stats["max"] - limits["max_outlet_pressure"],
                "severity": "high"
            })
        
        # Проверка оптимальной зоны работы
        if limits.get("optimal_outlet_pressure"):
            optimal_range = (
                limits["optimal_outlet_pressure"] * 0.9,
                limits["optimal_outlet_pressure"] * 1.1
            )
            if not (optimal_range[0] <= running_stats["avg"] <= optimal_range[1]):
                issues.append({
                    "type": "outside_optimal",
                    "parameter": "outlet_pressure",
                    "actual": running_stats["avg"],
                    "optimal_range": optimal_range,
                    "severity": "medium"
                })
    
    return issues
```

---

## Алгоритм выявления ложных сигналов

### Критерии ложного сигнала

1. **Оборудование выведено из эксплуатации:**
   - Уровень в емкости < 0
   - Давление стабильно на нуле
   - Отсутствие изменений параметров длительное время

2. **Оборудование остановлено:**
   - Для сигналов давления на выкиде при остановленном насосе
   - Для сигналов уровня при остановленном насосе (если уровень зависит от работы насоса)

3. **Отсутствие данных:**
   - Обрыв связи длительное время
   - Нулевые значения качества данных

4. **Плановые работы:**
   - Сигналы совпадают с календарем плановых работ

### Алгоритм

```python
def detect_false_alarms(alarm_list, period_start, period_end):
    """
    Выявляет ложные сигналы из списка аварийных сигналов
    """
    false_alarms = []
    
    for alarm in alarm_list:
        parameter = get_parameter(alarm.parameter_id)
        object = get_object(parameter.object_id)
        equipment = get_equipment(parameter.equipment_id)
        
        # Загружаем данные для анализа
        parameter_data = load_parameter_data(parameter.id, period_start, period_end)
        equipment_status = check_equipment_status(equipment.id, period_start, period_end)
        
        false_reasons = []
        
        # Проверка 1: Оборудование выведено из эксплуатации
        if equipment_status["status"] == "decommissioned":
            false_reasons.append({
                "type": "equipment_decommissioned",
                "reason": equipment_status["reason"],
                "confidence": "high"
            })
        
        # Проверка 2: Оборудование остановлено (для определенных типов сигналов)
        if parameter.parameter_type == "pressure" and "выкид" in parameter.parameter_name.lower():
            pump_status = get_pump_status_at_time(equipment.id, alarm.triggered_at)
            if pump_status == "stopped":
                false_reasons.append({
                    "type": "pump_stopped",
                    "reason": "Сигнализация срабатывает при остановленном насосе",
                    "confidence": "high"
                })
        
        # Проверка 3: Отсутствие данных
        if not parameter_data or len(parameter_data) == 0:
            false_reasons.append({
                "type": "no_data",
                "reason": "Отсутствие данных параметра",
                "confidence": "medium"
            })
        
        # Проверка 4: Стабильные нулевые значения
        if parameter_data:
            recent_values = [d.value for d in parameter_data[-100:] if d.value is not None]
            if recent_values:
                if max(recent_values) < 0.01 and min(recent_values) >= 0:
                    false_reasons.append({
                        "type": "zero_values",
                        "reason": "Параметр стабильно на нуле",
                        "confidence": "high"
                    })
        
        # Проверка 5: Плановые работы
        planned_works = get_planned_works(object.id, alarm.triggered_at - timedelta(hours=1),
                                          alarm.triggered_at + timedelta(hours=1))
        if planned_works:
            false_reasons.append({
                "type": "planned_works",
                "reason": f"Плановые работы: {', '.join([w.description for w in planned_works])}",
                "confidence": "medium"
            })
        
        # Если найдены причины ложного сигнала
        if false_reasons:
            false_alarm = {
                "alarm_id": alarm.id,
                "parameter_id": parameter.id,
                "object_id": object.id,
                "equipment_id": equipment.id,
                "false_reasons": false_reasons,
                "confidence": max([r["confidence"] for r in false_reasons], 
                                key=lambda x: {"high": 3, "medium": 2, "low": 1}[x]),
                "recommendation": generate_disable_recommendation(false_reasons, parameter, equipment)
            }
            false_alarms.append(false_alarm)
    
    return false_alarms
```

---

## Алгоритм проверки соответствия уставок

### Входные данные

```python
{
    "parameter_id": "uuid",
    "current_thresholds": [
        {"type": "min", "value": 1.4},
        {"type": "max", "value": 3.0},
        {"type": "alarm_min", "value": 1.2},
        {"type": "alarm_max", "value": 3.2}
    ],
    "actual_stats": {
        "avg": 2.0,
        "min": 1.8,
        "max": 2.4
    },
    "equipment_limits": {
        "max_pressure": 3.5,
        "min_pressure": 2.0
    },
    "regulatory_requirements": {
        "min_threshold_percent": 10,  # Уставка должна быть на 10% выше среднего
        "max_threshold_percent": 15   # Уставка должна быть на 15% выше среднего
    }
}
```

### Алгоритм

```python
def validate_thresholds(parameter_id, current_thresholds, actual_stats,
                       equipment_limits, regulatory_requirements):
    """
    Проверяет соответствие уставок фактическим параметрам и нормативам
    """
    issues = []
    recommendations = []
    
    # Проверка минимальной уставки
    min_threshold = next((t for t in current_thresholds if t["type"] == "min"), None)
    if min_threshold:
        # Проверка: уставка должна быть ниже минимального фактического значения
        if min_threshold["value"] > actual_stats["min"]:
            issues.append({
                "type": "threshold_above_actual_min",
                "threshold_type": "min",
                "threshold_value": min_threshold["value"],
                "actual_min": actual_stats["min"],
                "deviation": min_threshold["value"] - actual_stats["min"],
                "severity": "high"
            })
            
            # Расчет рекомендуемой уставки
            recommended_min = actual_stats["min"] * (1 - regulatory_requirements["min_threshold_percent"] / 100)
            recommendations.append({
                "type": "decrease_min_threshold",
                "current_value": min_threshold["value"],
                "recommended_value": round(recommended_min, 2),
                "justification": f"Фактическое минимальное значение {actual_stats['min']} МПа, уставка {min_threshold['value']} МПа выше фактического"
            })
    
    # Проверка максимальной уставки
    max_threshold = next((t for t in current_thresholds if t["type"] == "max"), None)
    if max_threshold:
        # Проверка: уставка должна быть выше максимального фактического значения
        if max_threshold["value"] < actual_stats["max"]:
            issues.append({
                "type": "threshold_below_actual_max",
                "threshold_type": "max",
                "threshold_value": max_threshold["value"],
                "actual_max": actual_stats["max"],
                "deviation": actual_stats["max"] - max_threshold["value"],
                "severity": "high"
            })
            
            # Расчет рекомендуемой уставки
            recommended_max = actual_stats["max"] * (1 + regulatory_requirements["max_threshold_percent"] / 100)
            
            # Проверка: рекомендуемая уставка не должна превышать допустимое для оборудования
            if recommended_max > equipment_limits["max_pressure"]:
                recommendations.append({
                    "type": "replace_equipment",
                    "justification": f"Рекомендуемая уставка {recommended_max} МПа превышает допустимое для оборудования {equipment_limits['max_pressure']} МПа"
                })
            else:
                recommendations.append({
                    "type": "increase_max_threshold",
                    "current_value": max_threshold["value"],
                    "recommended_value": round(recommended_max, 2),
                    "justification": f"Фактическое максимальное значение {actual_stats['max']} МПа, уставка {max_threshold['value']} МПа ниже фактического"
                })
        
        # Проверка: уставка не должна превышать допустимое для оборудования
        if max_threshold["value"] > equipment_limits["max_pressure"]:
            issues.append({
                "type": "threshold_above_equipment_limit",
                "threshold_type": "max",
                "threshold_value": max_threshold["value"],
                "equipment_limit": equipment_limits["max_pressure"],
                "deviation": max_threshold["value"] - equipment_limits["max_pressure"],
                "severity": "critical"
            })
    
    # Проверка фактических значений против допустимых параметров оборудования
    if actual_stats["max"] > equipment_limits["max_pressure"]:
        issues.append({
            "type": "actual_above_equipment_limit",
            "actual_max": actual_stats["max"],
            "equipment_limit": equipment_limits["max_pressure"],
            "deviation": actual_stats["max"] - equipment_limits["max_pressure"],
            "severity": "critical"
        })
        
        recommendations.append({
            "type": "replace_equipment",
            "justification": f"Фактическое максимальное давление {actual_stats['max']} МПа превышает допустимое для оборудования {equipment_limits['max_pressure']} МПа"
        })
    
    if actual_stats["min"] < equipment_limits["min_pressure"]:
        issues.append({
            "type": "actual_below_equipment_limit",
            "actual_min": actual_stats["min"],
            "equipment_limit": equipment_limits["min_pressure"],
            "deviation": equipment_limits["min_pressure"] - actual_stats["min"],
            "severity": "high"
        })
        
        recommendations.append({
            "type": "investigate_equipment",
            "justification": f"Фактическое минимальное давление {actual_stats['min']} МПа ниже допустимого для оборудования {equipment_limits['min_pressure']} МПа"
        })
    
    return {
        "parameter_id": parameter_id,
        "validation_date": date.today(),
        "issues": issues,
        "recommendations": recommendations,
        "overall_status": "compliant" if not issues else "non_compliant"
    }
```

---

## Алгоритм генерации рекомендаций

### Шаблоны рекомендаций

```python
RECOMMENDATION_TEMPLATES = {
    "change_threshold": {
        "title_template": "Изменить уставку {parameter_name}",
        "description_template": "Рекомендуется {action} уставку {parameter_name} с {current_value} {unit} до {recommended_value} {unit}",
        "justification_template": "{justification}",
        "assignee_role": "ЦДНГ",
        "priority": "high"
    },
    "replace_equipment": {
        "title_template": "Заменить {equipment_name}",
        "description_template": "Рекомендуется произвести замену {equipment_name} на {recommended_model}. Текущие параметры {actual_value} {unit} выходят за допустимые {limit_value} {unit}",
        "justification_template": "{justification}",
        "assignee_role": "специалист отдела",
        "priority": "high"
    },
    "disable_alarm": {
        "title_template": "Отключить сигналы {parameter_name}",
        "description_template": "Рекомендуется отключить сигналы {parameter_name} для {equipment_name}. {reason}",
        "justification_template": "{justification}",
        "assignee_role": "ООО ПЦ",
        "priority": "medium"
    },
    "exclude_condition": {
        "title_template": "Исключить сигнализацию {parameter_name} при {condition}",
        "description_template": "Рекомендуется исключить сигнализацию {parameter_name} при {condition}",
        "justification_template": "{justification}",
        "assignee_role": "ООО ПЦ",
        "priority": "medium"
    },
    "epb": {
        "title_template": "Провести ЭПБ {equipment_name}",
        "description_template": "Рекомендуется провести ЭПБ {equipment_name}. Срок эксплуатации истек в {expiration_year} году",
        "justification_template": "Срок эксплуатации оборудования истек",
        "assignee_role": "ЦАСУТП",
        "priority": "high"
    },
    "develop_measures": {
        "title_template": "Разработать мероприятия по {action}",
        "description_template": "Разработать мероприятия по {action} для {equipment_name}",
        "justification_template": "{justification}",
        "assignee_role": "ЦДНГ",
        "priority": "high"
    }
}
```

### Алгоритм генерации

```python
def generate_recommendations(analysis_results, validation_results, false_alarm_results):
    """
    Генерирует рекомендации на основе результатов анализа
    """
    recommendations = []
    
    # Рекомендации из проверки уставок
    for rec in validation_results.get("recommendations", []):
        template = RECOMMENDATION_TEMPLATES.get(rec["type"])
        if template:
            recommendation = {
                "type": rec["type"],
                "title": template["title_template"].format(**rec),
                "description": template["description_template"].format(**rec),
                "justification": template["justification_template"].format(**rec),
                "assignee_role": template["assignee_role"],
                "priority": template["priority"],
                "object_id": analysis_results["object_id"],
                "parameter_id": analysis_results["parameter_id"],
                "current_value": rec.get("current_value"),
                "recommended_value": rec.get("recommended_value")
            }
            recommendations.append(recommendation)
    
    # Рекомендации по ложным сигналам
    for false_alarm in false_alarm_results:
        if false_alarm["confidence"] == "high":
            recommendation = {
                "type": "disable_alarm",
                "title": f"Отключить сигналы {false_alarm['parameter_name']}",
                "description": f"Рекомендуется отключить сигналы {false_alarm['parameter_name']} для {false_alarm['equipment_name']}",
                "justification": "; ".join([r["reason"] for r in false_alarm["false_reasons"]]),
                "assignee_role": "ООО ПЦ",
                "priority": "medium",
                "object_id": false_alarm["object_id"],
                "parameter_id": false_alarm["parameter_id"]
            }
            recommendations.append(recommendation)
    
    # Рекомендации по ЭПБ
    if analysis_results.get("equipment_limits", {}).get("expiration", {}).get("expired"):
        expiration = analysis_results["equipment_limits"]["expiration"]
        recommendation = {
            "type": "epb",
            "title": f"Провести ЭПБ {analysis_results['equipment_name']}",
            "description": f"Рекомендуется провести ЭПБ {analysis_results['equipment_name']}. Срок эксплуатации истек в {expiration['expiration_date'].year} году",
            "justification": "Срок эксплуатации оборудования истек",
            "assignee_role": "ЦАСУТП",
            "priority": "high",
            "object_id": analysis_results["object_id"],
            "equipment_id": analysis_results["equipment_id"]
        }
        recommendations.append(recommendation)
    
    # Удаление дубликатов
    unique_recommendations = remove_duplicates(recommendations)
    
    return unique_recommendations
```

---

## Заключение

Данный документ описывает детальные алгоритмы анализа аварийных сигналов. Алгоритмы основаны на:

1. **Статистическом анализе** - расчет средних, медиан, стандартных отклонений
2. **Сравнении периодов** - выявление трендов и изменений
3. **Проверке соответствий** - сравнение фактических параметров с уставками и нормативами
4. **Корреляционном анализе** - выявление связей между параметрами
5. **Правилах классификации** - детерминированные правила для выявления проблем

Все алгоритмы прозрачны и воспроизводимы, что обеспечивает доверие к результатам системы.

