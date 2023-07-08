---
layout: single
permalink: /projects/
author_profile: true
---

<style>
/* Insert the CSS code here */
/* Variables */
:root {
  --color-1: black;
  --color-2: white;
  --color-3: rgb(168, 50, 121);
}

/* Fonts */
@import url('https://fonts.googleapis.com/css?family=Open+Sans:300,700');

body {
  font-family: 'Open Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 1em;
  font-weight: 300;
  line-height: 1.5;
  letter-spacing: 0.05em;
}

/* Layout */
* {
  box-sizing: border-box;
}

/* Styling */
.timeline {
  margin: 4em auto;
  position: relative;
  max-width: 46em;
}

.timeline:before {
  background-color: var(--color-1);
  content: '';
  margin-left: -1px;
  position: absolute;
  top: 0;
  left: 2em;
  width: 2px;
  height: 100%;
}

.timeline-event {
  position: relative;
}

.timeline-event:hover .timeline-event-icon {
  transform: rotate(-45deg);
  background-color: var(--color-3);
}

.timeline-event:hover .timeline-event-thumbnail {
  box-shadow: inset 40em 0 0 0 var(--color-3);
}

.timeline-event-copy {
  padding: 2em;
  position: relative;
  top: -1.875em;
  left: 4em;
  width: 80%;
}

.timeline-event-copy h3 {
  font-size: 1.75em;
}

.timeline-event-copy h4 {
  font-size: 1.2em;
  margin-bottom: 1.2em;
}

.timeline-event-copy strong {
  font-weight: 700;
}

.timeline-event-copy p:not(.timeline-event-thumbnail) {
  padding-bottom: 0.6em;
}

.timeline-event-icon {
  transition: transform 0.2s ease-in;
  transform: rotate(45deg);
  background-color: var(--color-1);
  outline: 10px solid var(--color-2);
  display: block;
  margin: 0.5em 0.5em 0.5em -0.5em;
  position: absolute;
  top: 0;
  left: 2em;
  width: 1em;
  height: 1em;
}

.timeline-event-thumbnail {
  transition: box-shadow 0.5s ease-in 0.1s;
  color: var(--color-2);
  font-size: 0.75em;
  background-color: var(--color-1);
  box-shadow: inset 0 0 0 0em #ef795a;
  display: inline-block;
  margin-bottom: 1.2em;
  padding: 0.25em 1em 0.2em 1em;
}

a.project-link {
  color: #007bff;
  text-decoration: none;
}

a.project-link:hover {
  text-decoration: underline;
}
</style>

<ul class="timeline">
  <li class="timeline-event">
    <label class="timeline-event-icon"></label>
    <div class="timeline-event-copy">
      <p class="timeline-event-thumbnail">Master - Semester 2</p>
      <p><strong><u>Elliptic Curve Cryptography</u></strong><br>
      <a href="/projects/Master-Semester2/elliptic_curve_cryptography/signal_protocol/" class="project-link">Signal Protocol</a>
      </p>
      <p><strong><u>Quantum Information & Computation</u></strong><br>
      <a href="/projects/Master-Semester2/quantum_information_and_computation/semiquantum_cryptography/" class="project-link">Semi-Quantum Cryptography</a>
      </p>
      <p><strong><u>Machine Learning</u></strong><br>
      <a href="/projects/Master-Semester2/machine_learning/activity_recognition/" class="project-link">Activity Recognition (team)</a>
      </p>
    </div>
  </li>
  <li class="timeline-event">
    <label class="timeline-event-icon"></label>
    <div class="timeline-event-copy">
      <p class="timeline-event-thumbnail">Master - Semester 1</p>
      <p><strong><u>Cryptography</u></strong><br>
      <a href="/projects/Master-Semester1/cryptography/euclid_attack/" class="project-link">Euclid Attack</a><br>
      <a href="/projects/Master-Semester1/cryptography/factoring_and_discrete_logarithm_algorithms/" class="project-link">Factoring & Discrete Logarithm Algorithms</a>
      </p>
      <p><strong><u>Numerical Methods with Applications to ODE & PDE</u></strong><br>
      <a href="/projects/Master-Semester1/numerical_methods_for_ODE_and_PDE/solving_systems_of_chaotic_equations/" class="project-link">Solving Systems of Chaotic Equations</a>
      </p>
      <p><strong><u>Optimal Control Theory</u></strong><br>
      <a href="/projects/Master-Semester1/optimal_control_theory/kalman_filter_application/" class="project-link">Kalman Filter Appilcation</a>
      </p>
      <p><strong><u>Master Seminar 2022</u></strong><br>
      <a href="/projects/Master-Semester1/mcs_seminar_2022/cryptography_in_the_post_quantum_era/" class="project-link">Cryptography In The Post-Quantum Era</a>
      </p>
    </div>
  </li>
  <li class="timeline-event">
    <label class="timeline-event-icon"></label>
    <div class="timeline-event-copy">
      <p class="timeline-event-thumbnail">Bachelor</p>
      <p><strong><u>Bachelor Thesis</u></strong><br>
      <a href="/projects/Bachelor/bachelor_thesis/cryptography_in_the_post_quantum_era/" class="project-link">Cryptography In The Post-Quantum Era</a><br>
      </p>
    </div>
  </li>
</ul>
