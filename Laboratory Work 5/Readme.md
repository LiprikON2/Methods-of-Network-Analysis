# Лабораторная работа 5
> K33401 - Рейнгеверц Вадим
>

Для того, чтобы строить прогнозы о дальнейшем поведении сообщества, будет полезно определить, по принципу какой модели строятся отношения между его участниками. 
- Для выполнения работы вам понадобятся социальные графы, отражающие взаимоотношения участников 2 сообществ социальной сети Вконтакте 
- Можно использовать сформированные в ходе выполнения первой лабораторной работы. 


[Полезные материалы](http://leonidzhukov.net/hse/2014/socialnetworks/)

## Сообщества

#### "A" group (subset 5000)
Group ID: ij_salt

Owner ID: -204380239

![](https://i.imgur.com/OMgukiH.png)

![](https://i.imgur.com/iGdiUBd.jpeg)


#### "B" group (subset 1600)
Group ID: itmem

Owner ID: -127149194

![](https://i.imgur.com/86oXhVa.png)

![](https://i.imgur.com/56VhZ8V.png)

## 1. Постройте функции распределения степеней узлов для обоих сообществ
> На какую из известных вам функций похожа каждая из них? В отчёте отразите формулу, график.

Распределение степеней графа $P(k)$ определяется как доля узлов, имеющих степень $k$

Т.е. если в общей сложности $n$ узлов в сети и из них $n_k$ имеют степень $k$, то:

$\displaystyle P(k)=\frac{n_k}{n}$

Для "A" группы:

![](https://i.imgur.com/4ZM9gBH.png)

Для "B" группы:

![](https://i.imgur.com/9OFT9X2.png)

В обоих случаях функции напоминают $\displaystyle y=\frac{1}{x}$

Релевантный сниппет

![](https://i.imgur.com/a4JJmHm.png)

### Reference
- [Распределение степеней](https://ru.wikipedia.org/wiki/%D0%A0%D0%B0%D1%81%D0%BF%D1%80%D0%B5%D0%B4%D0%B5%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5_%D1%81%D1%82%D0%B5%D0%BF%D0%B5%D0%BD%D0%B5%D0%B9?useskin=vector)

## 2. Вычислите кластерные коэффициенты обоих сообществ
> **Кластерный коэффициент** (локальная плотность) ― вероятность того, что два соседа в графе связаны между собой

По формуле $\displaystyle C_i = \frac{2n_i}{k_i(k_i - 1)}$, где

$i$ ― нода

$k_i$ ― соседи ноды

$n_{i}$ ― число связей между соседями ноды

считаем для всех нод, и берем среднее. 

В итоге:

Для "A" группы:

![](https://i.imgur.com/4betFh9.png)


Для "B" группы:

![](https://i.imgur.com/OXhfLiY.png)


Релевантный сниппет

![](https://i.imgur.com/YTnatuK.png)

### Reference
- [Кластерный коэффициент](https://ru.wikipedia.org/wiki/%D0%9A%D0%BE%D0%BC%D0%BF%D0%BB%D0%B5%D0%BA%D1%81%D0%BD%D1%8B%D0%B5_%D1%81%D0%B5%D1%82%D0%B8?useskin=vector#%D0%9A%D0%BB%D0%B0%D1%81%D1%82%D0%B5%D1%80%D0%BD%D1%8B%D0%B9_%D0%BA%D0%BE%D1%8D%D1%84%D1%84%D0%B8%D1%86%D0%B8%D0%B5%D0%BD%D1%82)


## 3. Вычислите среднюю длину пути обоих графов

Для вычисление средней длины пути было осуществленно по следующему алгоритму:

1. Производилась итерация по всем нодам графа
2. У итерируемой ноды находился компонент, к которому она принадлежала (все потомки по связям)
3. Находились наикратчайшие пути по алгоритму Floyd-Warshall между итерируемой ноды и нодами компонента
4. Полученные длины путей добавляются в массив и в конце суммируются
5. Находилась средняя длина пути по формуле: 

$\displaystyle l_G=\frac{1}{n(n-1)}\sum d(v_i, j_i)$, где

$n$ ― количество нод

Для "A" группы:

![](https://i.imgur.com/NjkWPxf.png)


Для "B" группы:

![](https://i.imgur.com/H1aiXdl.png)

### Reference
- [Average path length](https://en.wikipedia.org/wiki/Average_path_length?useskin=vector#Definition)


## 4. Изучите существующие модели социальных сетей
> Каковы характерные для них диапазоны оценок? 
> Какую (или какие) из них напоминают исследуемые графы?

> **Note**
> 
> На практике не всегда получается подогнать сообщество под одну из существующих моделей, но вычисленные вами метрики помогут оценить сходство. 
> 
> Оцените:
> - Попадают ли получившиеся значения метрик в диапазоны оценок известных моделей
> - С какой точностью определены характерные значения в вашем случае. 
> 
> В этом вам может помочь следующая таблица:
> ![](https://i.imgur.com/tg8ADUX.png)


## Getting VK API key

1. Make sure that app is enabled at [dev.vk.com - My Apps - Settings - App status](https://vk.com/editapp?id=51591070&section=options)
2. Run following snippet in Browser console:

```js
window.open("https://oauth.vk.com/authorize?client_id=51591070&display=page&redirect_uri=http://127.0.0.1:5173&scope=1026&response_type=token&v=5.131&state=123456");
```

3. Copy api key from url in newly opened tab. 
   - It starts just after `...access_token=` 
   - It ends just before `&expires_in=86400...`
4. Put key into `secrets/api.json` like this:
```js
{
    "api": "vk1.a.seAyNJUtqjJhVcvMMWk6NDO7ACF5YoNS-JzPAqAYN9wcybnDkrMpC_dvIkjx7hlSlfSxebtioYIRsovyi-aQXjoNytBwR14TB37HXJijDhzRXXE6SPG-g4wnwHXxDAic-ncCZ-DnVsyjaZOEEtxaqz7x0hwXMxkgJB0yYhMDwBqpLlwFt8HhsZ9guMG_zQwCM5m4_Z3SKXgV1fmpqv-6pQ"
}
```