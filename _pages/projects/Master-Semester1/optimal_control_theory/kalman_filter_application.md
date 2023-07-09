---
layout: single
title: "Studying steady speed movement with Kalman filter"
permalink: /projects/Master-Semester1/optimal_control_theory/kalman_filter_application/
author_profile: true
---

## Abstract 

A script was made for an assignment of the class ”Optimal Control Theory” of my master’s program:  

**<u>Assignment.</u>**
Perform a simulation of the movement of an object based on <u>Example 2</u> (can be seen in the .ipynb file). Give estimations of the states for 20* steps. <br>
Assume that $\Delta t$ is stable, e.g. $\Delta t = 0.1$, and choose matrices Q and R of the form  

$$
Q = \begin{bmatrix}
\frac{q_1(\Delta t)^3}{3} & 0 & \frac{q_1(\Delta t)^2}{2} & 0 \\
0 & \frac{q_2(\Delta t)^3}{3} & 0 & \frac{q_2(\Delta t)^2}{2} \\
\frac{q_1(\Delta t)^2}{2} & 0 & q_1 \Delta t & 0 \\
0 & \frac{q_2(\Delta t)^2}{2} & 0 & q_2 \Delta t
\end{bmatrix}
, \quad R = \begin{bmatrix}
\sigma_1^2 & 0 \\
0 & \sigma_2^2
\end{bmatrix}
$$  
  
setting "proper" values for the parameters (e.g. $\sigma_1=\sigma_2 = 1/2$ and $q_1=q_2=1$).    
  
**Note.** The script that i made can be used for any $k_{upper}$ number of steps, with $k_{upper}=20$ being the input in the final "Solving the problem" section.

## Files Included

- [Interactive Python Notebook](https://github.com/florias-papadopoulos/florias-papadopoulos.github.io/blob/master/_pages/projects/Master-Semester1/optimal_control_theory/kalman_filter.ipynb) (english)

## Keywords

 Kalman filter, Position estimators
