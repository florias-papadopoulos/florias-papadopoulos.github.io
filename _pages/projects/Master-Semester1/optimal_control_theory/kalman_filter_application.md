---
layout: single
title: "Studying steady speed movement with Kalman filter"
permalink: /projects/Master-Semester1/optimal_control_theory/kalman_filter_application/
author_profile: true
---

## Abstract 

A script was made for an assignment of the class ”Optimal Control Theory” of my master’s program:  

**<u>Exercise.</u>**
Perform a simulation of the movement of an object based on <u>Example 2</u>.  
Give estimations of the states for 20* steps.  
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

---------------------------------------------------------------------------------------------------
**Example 2.**    
Estimate the position of an object that is moving with steady speed on the plane. We assume that we possess the measurements of the position of the moving object in $k$ equidistant $\Delta t$ time intervals, for $k=1,2,\dots$, and that both the movement and the measurements are subject to Gaussian noise.  

<u>Solution</u>  
Firstly, we assume that the state vector is the 4-dimensional, $x_k = (x_{k,1}, x_{k,2}, x_{k,3}, x_{k,4})^T$, where the first two components, $x_{k,1}$ and $x_{k,2}$ are the position-components (in a 2-dimensional cartesian coordinates system), and the components $x_{k,3}$ and $x_{k,4}$ are the speed-components. Moreover, we assume that the measurement vector is 2-dimensional, $z_k = (z_{k,1}, z_{k,2})^T$, where $z_k$ gives us the observed position of the moving object in step $k$, $k=1,2,\dots$.  
Hence, and considering that the object is moving with steady speed, we will have the following relations: 

$$
\begin{align*}
x_{k,1} &= x_{k-1,1} + \Delta t \cdot x_{k-1,3} + w_{k-1,1} \\
x_{k,2} &= x_{k-1,2} + \Delta t \cdot x_{k-1,4} + w_{k-1,2} \\
x_{k,3} &= x_{k-1,3} + w_{k-1,3} \\
x_{k,4} &= x_{k-1,3} + w_{k-1,4} \\
z_{k,1} &= x_{k,1} + \nu_{k,1} \\
z_{k,2} &= x_{k,2} + \nu_{k,2} 
\end{align*}
$$

which can be written in matrix form as

$$
\begin{align*}
x_k & = Ax_{k-1} + w_{k-1} \\
z_k & = Hx_{k-1} + \nu_{k-1} \\
\end{align*}
$$

with $w_k \sim \mathcal{N}(0,Q)$ and $\nu_k \sim \mathcal{N}(0,R)$,

$$
A = \begin{bmatrix}
1 & 0 & \Delta t & 0 \\
0 & 1 & 0 & \Delta t \\
0 & 0 & 1 & 0 \\
0 & 0 & 0 & 1
\end{bmatrix}
, \quad H = \begin{bmatrix}
0 & 0 & 1 & 0 \\
0 & 0 & 0 & 1
\end{bmatrix}
$$, as well as $w_k = (w_{k,1}, w_{k,2}, w_{k,3}, w_{k,4})^T$ and $\nu_k = (\nu_{k,1}, \nu_{k,2})^T$.

---------------------------------------------------------------------------------------------------

## Files Included

- [Interactive Python Notebook](./kalman_filter.ipynb) (english)

## Keywords

 Kalman filter, Position estimators
