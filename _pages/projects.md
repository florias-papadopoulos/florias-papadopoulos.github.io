---
layout: single
title: "Projects"
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
  padding-bottom: 1.2em;
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

.dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-content {
  display: none;
  position: absolute;
  background-color: var(--color-1);
  box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
  z-index: 1;
  padding: 10px;
  width: auto;
}

.dropdown:hover .dropdown-content {
  display: block;
}

.dropdown-item {
  padding: 5px 0;
  text-decoration: none;
  display: block;
}

.dropdown-item:hover {
  background-color: var(--color-3);
  color: var(--color-2);
}
</style>

<ul class="timeline">
  <li class="timeline-event">
    <label class="timeline-event-icon"></label>
    <div class="timeline-event-copy">
      <p class="timeline-event-thumbnail">Master - Semester 2</p>
      <div class="dropdown">
        <p><strong><u>Projects of courses</u></strong></p>
        <div class="dropdown-content">
          <a href="/projects/Master-Semester2/project1/" class="dropdown-item">Project1</a>
          <a href="/projects/Master-Semester2/project2/" class="dropdown-item">Project2</a>
        </div>
      </div>
      <div class="dropdown">
        <p><strong><u>Extra Projects</u></strong></p>
        <div class="dropdown-content">
          <a href="/projects/Master-Semester2/extra-project1/" class="dropdown-item">Extra Project1</a>
          <a href="/projects/Master-Semester2/extra-project2/" class="dropdown-item">Extra Project2</a>
        </div>
      </div>
    </div>
  </li>
<li class="timeline-event">
    <label class="timeline-event-icon"></label>
    <div class="timeline-event-copy">
        <p class="timeline-event-thumbnail">Master - Semester 1</p>
        <div class="dropdown">
            <p><strong><u>Projects of courses</u></strong></p>
            <div class="dropdown-content">
                <a href="/projects/Master-Semester1/projectA/" class="dropdown-item">ProjectA</a>
                <a href="/projects/Master-Semester1/projectB/" class="dropdown-item">ProjectB</a>
            </div>
        </div>
        <div class="dropdown">
            <p><strong><u>Extra Projects</u></strong></p>
            <div class="dropdown-content">
                <a href="/projects/Master-Semester1/extra-project1/" class="dropdown-item">Extra Project1</a>
                <a href="/projects/Master-Semester1/extra-project2/" class="dropdown-item">Extra Project2</a>
            </div>
        </div>
    </div>
</li>
<li class="timeline-event">
    <label class="timeline-event-icon"></label>
    <div class="timeline-event-copy">
        <p class="timeline-event-thumbnail">Bachelor</p>
        <div class="dropdown">
            <p><strong><u>Projects of courses</u></strong></p>
            <div class="dropdown-content">
                <a href="/projects/Bachelor/projectX/" class="dropdown-item">ProjectX</a>
                <a href="/projects/Bachelor/projectY/" class="dropdown-item">ProjectY</a>
            </div>
        </div>
        <div class="dropdown">
            <p><strong><u>Extra Projects</u></strong></p>
            <div class="dropdown-content">
                <a href="/projects/Bachelor/extra-projectX/" class="dropdown-item">Extra ProjectX</a>
                <a href="/projects/Bachelor/extra-projectY/" class="dropdown-item">Extra ProjectY</a>
            </div>
        </div>
    </div>
</li>
</ul>

