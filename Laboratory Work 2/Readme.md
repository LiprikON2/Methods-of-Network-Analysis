# Лабораторная работа 2
> K33401 - Рейнгеверц Вадим


## Выполнение

### Из Лабораторной работы 1

#### "B" group
Group ID: `itmem`

Owner ID: `-127149194`

![](https://i.imgur.com/86oXhVa.png)


Кластеризация производилась следующим образом:

- Формировался layout, последовательно применяя следующие алгоритмы: grid, fcose, spread
- На основе полученного графа, у нод считалась нормализированная Closeness centrality
- Осуществлялась сама кластеризация через алгоритм kMeans по значению closeness у нод
- Нодам ставится цвет самого большого кластера, к которому они принадлежат

Группа "B" (обрезано до 1600 пользователей), при k=50 получалось 23-31 кластеров (из более 2-х элементов)
![](https://i.imgur.com/4Oev7a5.png)

В обрезанной версии "B" группы, получилось 1600 нод и 4818 связей

### 1. Найдите наиболее авторитетных пользователей

> **Центральность** - число минимальных кратчайших путей между любыми двумя его "друзьями" или "собеседниками", проходящих через него

Так как метрика нормализированной центральности уже использовалась для кластеризации, был добавлен фильтр, который акцентирует стиль для нод с центральностью выше определенного порога.

Учитывая, что у нормализированной центральности диапазон значений от 0 до 1, то ноды со значением:

- 0 ― имеют минимальное количество связей
- 1 ― имеют максимальное количество связей

Используя порог `centrality > 0.85` получаем топ 15% пользователей по количеству связей

![](https://i.imgur.com/dcbYEiW.jpeg)

Таких пользователей получилось 7

<div style="page-break-after: always;"></div>


### 2. Вычислите плотность социального графа

> Максимально возможное число связей
>$$\|E\|_{\text{max}}=\frac{\|N\|\ \left(\|N\| - 1\right)}{2}$$
>
>$\|N\|$ - количество нод

Получается:

$$\|E\|_{\text{max}}=\frac{1600\cdot(1600 - 1)}{2}= 1\ 279\ 200$$


> Плотность графа
>$$\rho_g=\frac{\|E\|\quad\ \ }{\|E\|_{\text{max}}}$$
>
>$\|E\|$ ― количество связей

Тогда:

$$\rho_g= \frac{4813}{1\ 279\ 200}= 0.0038=0.38\%$$


### 3. Является ли граф связным? Что это означает применительно к исследуемому социальному графу?
> **Связный граф** - граф, в котором между любой парой нод существует как минимум одна связь

Граф не является связным, т.к. далеко не у всех пользователей группы "B" есть друзья в этой же группе

<div style="page-break-after: always;"></div>


### 4. Рассчитайте максимальное, минимальное и среднее значение степени нодов графа

> **Степень ноды графа** — количество связей графа $G$, инцидентных ноде $x$. При подсчёте степени связь-петля учитывается дважды
> 
> **Инцидентность** ― "смежность" ноды и связи
>
> $d(x)$ ― степень ноды $x$
>
> $\Delta(G)$ ― максимальная степень ноды графа $G$
> 
> $\delta(G)$ ― минимальная степень ноды графа $G$
>

Максимальная степень ноды:

$\Delta(G)=149$

Фильтром `degree > 140` выделяем пользователя

![](https://i.imgur.com/KDG8PD6.jpeg)

Минимальная степень ноды:

$\delta(G)=0$

Средняя степень нод:

$d_{avg}(G)\approx6$

<br/>

![](https://i.imgur.com/vmY4qKL.png)


[Релевантный сниппет](./core/main.js#L309)
![](https://i.imgur.com/QS7vte2.png)



### 5. Рассчитайте модулярность графа
> **Модулярность графа** — мера структуры для измерения силы разбиения сети на кластерами или сообществам. Сети с высокой модулярностью имеют плотные связи между узлами внутри модулей, но слабые связи между узлами в различных модулях
> 
> Значение модулярности, близкое к:
>
> - 0 ― означает, что все ноды находятся в одном сообществе
> - 0.3 – 0.4 ― означает, что имеется ярко выраженная сообщественная структура.


Модулярность графа, если в качестве веса связей использовать нормализированную центральность ноды-источника
![](https://i.imgur.com/HAL17Ic.png)

Модулярность графа, если в качестве веса связей использовать степень ноды-источника
![](https://i.imgur.com/TmEjMyO.png)

Итоговый социальный граф
![](https://i.imgur.com/gIhCaGD.png)


[Релевантный сниппет](./core/main.js#L280)
![](https://i.imgur.com/jQvVcOr.png)


#### Источники

- [Wikipedia (en)](https://en.wikipedia.org/wiki/Modularity_(networks))
- [Wikipedia (ru)](https://ru.wikipedia.org/wiki/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8F%D1%80%D0%BD%D0%BE%D1%81%D1%82%D1%8C_(%D0%BD%D0%B0%D1%83%D0%BA%D0%B0_%D0%BE_%D1%81%D0%B5%D1%82%D1%8F%D1%85))
- [Related pdf paper](https://www.researchgate.net/publication/334158692_ON_THE_MAXIMUM_OF_THE_MODULARITY_OF_RANDOM_CONFIGURATION_GRAPHS/fulltext/5d1ac85da6fdcc2462b73c53/ON-THE-MAXIMUM-OF-THE-MODULARITY-OF-RANDOM-CONFIGURATION-GRAPHS.pdf)
- [stackoverflow](https://stackoverflow.com/a/49898854)


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