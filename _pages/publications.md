---
layout: page
permalink: /publications/
title: Publications
description: Papers, preprints and book chapters, newest first. Bold marks her name.
nav: true
nav_order: 3
---

<!-- _pages/publications.md -->

<link rel="stylesheet" href="{{ '/assets/custom/pubs.css' | relative_url | bust_file_cache }}">

{%- assign pub_map = site.data.pub_topics.papers -%}
{%- assign pub_total = 0 -%}
{%- for p in pub_map -%}{%- assign pub_total = pub_total | plus: 1 -%}{%- endfor -%}
<div class="pub-filter" role="group" aria-label="Filter publications by topic" hidden>
  <button type="button" class="pub-chip" data-topic="all" aria-pressed="true">All <span class="pub-chip-count">{{ pub_total }}</span></button>
  {%- for t in site.data.pub_topics.topics -%}
    {%- assign n = 0 -%}
    {%- for p in pub_map -%}{%- if p[1] == t.id -%}{%- assign n = n | plus: 1 -%}{%- endif -%}{%- endfor -%}
    {%- if n > 0 %}
  <button type="button" class="pub-chip" data-topic="{{ t.id }}" aria-pressed="false">{{ t.label }} <span class="pub-chip-count">{{ n }}</span></button>
    {%- endif -%}
  {%- endfor %}
</div>
<small class="pub-status" aria-live="polite" hidden></small>
<script type="application/json" id="pub-topics">{{ pub_map | jsonify }}</script>

<p class="pub-search" hidden><input type="search" id="bibsearch" spellcheck="false" autocomplete="off" class="search bibsearch-form-input" placeholder="Type to filter" aria-label="Filter publications by text"></p>

<div class="publications">

{% bibliography %}

</div>

<p class="image-credit">Thumbnail figures are reproduced from the authors' arXiv preprints: <em>Image to Image Translation</em> (V. Ingale, R. Singh, P. Patwal, <a href="https://arxiv.org/abs/2105.09253">arXiv:2105.09253</a>, CC BY-NC-SA 4.0) and <em>GenNet</em> (V. Ingale, P. Singh, <a href="https://arxiv.org/abs/2003.04360">arXiv:2003.04360</a>, CC BY 4.0).</p>

<script defer src="{{ '/assets/js/pubs.js' | relative_url | bust_file_cache }}"></script>
