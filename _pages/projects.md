---
layout: single
title: "Projects"
permalink: /projects/
author_profile: true
---

{% raw %}
<style>
  :root {
    --primary-color: #212121;
    --background-color: #111;
    --font: sans-serif;
  }

  * {
    margin: 0;
    padding: 0;
  }

  body {
    background: var(--background-color);
    font-family: var(--font);
    display: flex;
    justify-content: center;
    padding-top: 20px; /* Add padding to prevent overlap with sidebar */
  }

  .timeline {
    background: var(--primary-color);
    margin: 20px auto;
    padding: 20px;
  }

  .card {
    position: relative;
    max-width: 400px;
  }

  .card:nth-child(odd) {
    padding: 30px 0 30px 30px;
  }

  .card:nth-child(even) {
    padding: 30px 30px 30px 0;
  }

  .card::before {
    content: "";
    position: absolute;
    width: 50%;
    border: solid orangered;
  }

  .card:nth-child(odd)::before {
    left: 0px;
    top: -4.5px;
    bottom: -4.5px;
    border-width: 5px 0 5px 5px;
    border-radius: 50px 0 0 50px;
  }

  .card:nth-child(even)::before {
    right: 0;
    top: 0;
    bottom: 0;
    border-width: 5px 5px 5px 0;
    border-radius: 0 50px 50px 0;
  }

  .card:first-child::before {
    border-top: 0;
    border-top-left-radius: 0;
  }

  .card:last-child:nth-child(odd)::before {
    border-bottom: 0;
    border-bottom-left-radius: 0;
  }

  .card:last-child:nth-child(even)::before {
    border-bottom: 0;
    border-bottom-right-radius: 0;
  }

  .info {
    display: flex;
    flex-direction: column;
    background: #333;
    color: gray;
    border-radius: 10px;
    padding: 10px;
  }

  .title {
    color: orangered;
    position: relative;
  }

  .title::before {
    content: "";
    position: absolute;
    width: 10px;
    height: 10px;
    background: white;
    border-radius: 999px;
    border: 3px solid orangered;
  }

  .card:nth-child(even) > .info > .title {
    text-align: right;
  }

  .card:nth-child(odd) > .info > .title::before {
    left: -45px;
  }

  .card:nth-child(even) > .info > .title::before {
    right: -45px;
  }
  
  /* Adjust sidebar width to prevent overlap */
  .sidebar {
    width: 200px; /* Adjust width as needed */
    margin-left: 20px;
  }
</style>

<div class="timeline">
  <div class="outer">
    <div class="card">
      <div class="info">
        <h3 class="title">Title 1</h3>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
      </div>
    </div>
    <div class="card">
      <div class="info">
        <h3 class="title">Title 2</h3>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
      </div>
    </div>
    <div class="card">
      <div class="info">
        <h3 class="title">Title 3</h3>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
      </div>
    </div>
    <div class="card">
      <div class="info">
        <h3 class="title">Title 4</h3>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
      </div>
    </div>
    <div class="card">
      <div class="info">
        <h3 class="title">Title 5</h3>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
      </div>
    </div>
  </div>
</div>
{% endraw %}