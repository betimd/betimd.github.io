---
layout: post
title: SOA applications tech stack
date: 2013-09-28 23:54
author: betim
comments: true
categories: []
tags:
  [
    .net,
    asp.net,
    betim drenica,
    C#,
    Development,
    microsoft,
    no sql,
    php,
    Programming,
    programming,
    service stack,
    SOA,
    sql server,
    Technology,
    technology,
    web api,
    Windows Forms,
    wpf,
  ]
---

There are a lot of times when I am asked to complete a stack of technologies for building a Service Oriented Applications. And of course, like for everything, also for this topic there are a lot of answers (and opinions). Using this post I want to express my opinion based in my experience (through years in building medium-to-large applications for public and private sector), what are pieces to combine a SOA lego. So, here I am going to explain what are technologies that could be used to build a SOA application, of course Windows environment friendly. But, this post, is not attempting to give a complete tech stack for this type of apps.

[caption id="" align="aligncenter" width="423"]<img alt="SOA " src="http://www.modernanalyst.com/Portals/0/Public%20Uploads/SOA-Fotolia_11660239_XS.jpg" width="423" height="283" /> SOA [/caption]

<!--more-->Always I have tried to see this problem from a very generic standpoint (just three parts). And, separating it in three parts, <em>data</em> part, <em>service</em> part and <em>client</em> part, make it easy to explain and catch.

[caption id="attachment_461" align="aligncenter" width="640"]<img class="size-full wp-image-461" alt="SOA-tech-stack" src="http://blog.betimdrenica.com/wp-content/uploads/2013/09/soa-tech-stack.png" width="640" height="360" /> SOA Tech Stack[/caption]

So, I will refer to this picture to explain what are technologies I used through years to build a robust SOA application.

<h1>Data part</h1>
As it's known every application needs a persistent data storage. In this part to make a selection depends in scenario, but first you have to decide in concept level, do you need a structured data store or a non-structured one. In first part immediately take place (famous) <a title="RDBMS" href="http://en.wikipedia.org/wiki/RDBMS" target="_blank">RDBMS</a>, with a lot of choices like SQL Server, Oracle or MySQL, or many others. And in second part you have two choices, a file approach (XML, or other type) or a kind-of-db approach, non-structured databases (or NO-SQL).
<h1>Service part</h1>
In service part, I used to work with different technologies, and I was happy with them, almost happy :). But today it's a kind of more approach and "developer-culture" what are you going to use, a <a title="SOAP" href="http://en.wikipedia.org/wiki/SOAP" target="_blank">SOAP</a> approach or <a title="REST" href="http://en.wikipedia.org/wiki/REST" target="_blank">REST</a> approach (that's make you look cool). If you need / choose SOAP approach Windows Communication Foundation has it's dedicated throne, it's simply near-to-perfect solution (without configuration part :(, that's more tricky than hard). And in REST part (that's TBH I'm preferring and using a lot lately) I prefer two very "fancy" and robust technologies like ASP.Net Web API and ServiceStack.Net. Both of them are easy to start and offer complete functionality list to expose a good REST service.
<h1>Client part</h1>
Huh, this is a hot part. Tons of choices. First of first, depends on your scenario (hah, I like this approach, do all the post just using "depends on your scenario" :) ), if you need a desktop application, web one or mobile. In Windows desktop app you have two very mature technologies like Windows Forms and Windows Presentation Foundation. I like both, but I prefer more WPF because of it's declarative user interface technology - XAML. In web part you have two "hard-competitors" ASP.Net and PHP. Now it's visible that .Net fans always think for ASP.Net and others PHP. In my eyes I see them in pretty same position with a decision indicated by hosting environment. And of course if you need to touch <em>planet</em> you have to think for mobile and again, depends on you scenario you can develop your app for Windows Phone, Android or iOS. All shines on something, user base, money or fanciness or all :).

And, last but not least, something is very clear, Service Oriented Applications are need, style and hot topic nowadays, because of many factors like portability, security, scale-ability, reach-ability and \*ability, and you as developer have to master it. Or, your ideas are cloud!?
