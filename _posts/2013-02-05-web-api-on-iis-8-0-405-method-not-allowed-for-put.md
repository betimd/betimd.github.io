---
layout: post
title: Web API on IIS 8.0 - 405 Method Not Allowed for PUT
date: 2013-02-05 11:46
author: betim
comments: true
categories: []
tags:
  [
    ASP.NET,
    asp.net,
    betim drenica,
    Development,
    http,
    IIS,
    iis 8,
    Microsoft,
    put,
    rest,
    web api,
    WebAPI,
  ]
---

Lately I'm extensively developing my web services in ASP.Net Web API and generally speaking it's good framework in supporting HTTP programming (REST "style"), even if it is in it's early stages and needed more features to be "completed".

Yesterday I had a very interesting problem when I published new version of my project (btw, I am developing web api in ASP.Net 4.5 and deploy it in Windows Server 2012 and IIS 8).

When I hit my web api with a PUT request (PUT -&gt; api.mydomain.com/profilecontroller/) web server's response was error 405 (or method not allowed) while in same time my controller supported all types of requests (get, post, put, delete).

I was surprised with this error while just few minutes earlier everything worked perfectly.

I googled for some time and get disappointed with results - no solution found.

Started to think what I did with my web server and I remembered some "not friendly" touches :D in Web Server (IIS) Role configuration, like installing "WebDAV Publishing".

I immediately uninstalled (unchecked) that "feature (not Windows Feature :D)" in Web Server (IIS) Role and everything started to work like a charm :D.

<a href="http://blog.betimdrenica.com/wp-content/uploads/2013/02/iisrolewebdav.png"><img class="aligncenter size-full wp-image-424" alt="IIS Role WebDav" src="http://blog.betimdrenica.com/wp-content/uploads/2013/02/iisrolewebdav.png" width="640" height="453" /></a>

It was kind of a stupid solution (I have to admit) but finally everything worked fine :D.

&nbsp;
