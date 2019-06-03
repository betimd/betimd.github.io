---
layout: post
title: Ideal REST API design
date: 2015-03-09 09:20
author: betim
comments: true
categories: []
tags: [API, Development, rest, SOA, SOAP, software architecture, web api]
---

<h1>Introduction / short history</h1>
<a href="http://blog.betimdrenica.com/wp-content/uploads/2015/03/api2.png"><img class="aligncenter size-medium wp-image-538" src="http://blog.betimdrenica.com/wp-content/uploads/2015/03/api2.png?w=300" alt="api2" width="300" height="176" /></a>

In mobile (tablet is included) era REST eclipsed SOAP in terms of web services. And, if we see and analyse in details both architectures (respectively architecture styles), and get environment constraints get just data what I request instead of "two hundred pages manual what I will get" is great, practical and useful. Imagine a mobile user using mobile data to get ten most popular books and consuming a SOAP service, just getting WSDL will push that month's data invoice to limits. But coming from SOAP, with a commodity and many things defined for years, REST APIs have open a lot of debates in almost all aspects REST tends to resolve, make solution. So, after all years in designing (and consuming a lot) REST APIs I did a list of things I consider an ideal rest api design should contain.

<h1>Media types</h1>
Every Web API must support several media types but two are considered un-avoided, XML and JSON. Because of a latest momentum of HTTP programming and following standards JSON tends to be the most preferred and for this reason should unequivocally  be default media type.

But XML has its own place, because of its robustness to present very complex scenarios and history (SOAP), if we can consider like this.

<h1>Partial results</h1>
If your API will be popular and you're exposing big objects you will face situations in a big number of scenarios where there's no need to get all fields of a resource, and if your api will support partial results will be a good benefit for consumers. Let's take an example of countries resources, you will have an id, name, description, date added, status, shortcode, flag, etc. Most frequent scenarios when applications needs to display the resource are just Id (for internal relations with other information), name and possible flag, all other info you have / need for youself. But this, of course will come with a price in you infrastracture because querying will take longer and needs more resources (hope you will do something with caching).<!--more-->
<h1>Caching</h1>
Caching will save your life. Caching will destroy your life. And balance is caching is great feature for your api but will come with a price. As API designer I am big fan of caching while in your applications there are frequent scenarios when some tertial information is changing so rarily. I would favor a lot client caching vs server, but both are positive. The mechanism will improve execution time and a lot of related resources.
<h1>Security</h1>
Web API must be secured properly to resist “desire” of unauthorized people to access it. Web API must maintain a list of all developers / applications that are allowed to access API in a persistent location and check that list for every request. Access keys and roles must be very desired to assure that everything is under control. We have seen a lot of scenarios in the net when "some fields" that were not planned to be visible, were accessible through APIs but not through regular websites or official apps. If you're designing APIs for your company that will be consumed by your applications, (and for scalability of these scenarios) applications are developed by other groups (in or outside your company), I saw a below design of security part in terms of accessing and roles must be in place.
<h2>Access Key</h2>
Web API must be accessible just using a key, unique key. Every combination developer / application must have its own key.
<h2>Roles (in backend)</h2>
According to my experience I found an API must support user roles. Below are roles I think it could have an API.
<h3>User</h3>
User role are for all users. Let’s say application users. They have access to all features of the API, but they can operate just in their resources, like UserId = 13 can do operations just for this Id but no others.
<h3>Administrator</h3>
Administrator is a powered role (but not most powered). It can do all operations for all users but not remove other admins or change the ownership of the API (add or remove super administrators). Admins are not allowed to create developer keys or to remove others from admins role. Either they have access to execute all methods of a resource.
<h3>Super Administrator</h3>
Super Administrator is most powered role in API. It can do everything.
<h3>Viewer</h3>
This role is just for auditing. It can just make selections, no post, no put, and no delete.

But if your api is public / not directly for you company roles tends to be not good fit, so consider other mechanisms of security. Nowadays OAuth2 and other mechanisms tend to be a very good choice to implement, and tokens are first citizen in these scenarios.

<h1>Versioning</h1>
Versioning of APIs is an interesting topic and there are several forms that you can achieve a good solution in this scenario. It could be great if you resist to time in terms of applying good architecture and analysis and the need for new versions of your APIs is reduced. But this is totally un-avoided situation so you have to have in place and plans.

I am fan of url versioning over header practice. In the first solution you have to tell in url the version of resource you're looking for and server will answer accordingly to its existence with a falldown to an existing one if you try to play with numbers. In other side, second solution is, that url of resource always stay the same, but you mention in header version of the resource and server will respond accordingly. While version is not in place as header term is a little bit more complicated to be sent by applications while in my experience that developers always tend to make GET requests as simple as the can.

<h1>Constraints</h1>
Throttling  is a must have mechanism that every API must implement. Imagine if an application will send millions of requests in minute to your backend, servers will go on fire. So, with constraints in place you can control them and direct to your pool accordingly. I am big fan of IP, client, number of request and any other meaningful throttling mechanism in terms of controlling requests made by clients.  I am not fan of blocking app but just letting it wait for a period of time until the server are relaxed of course just if the accident is not repeated.
<h1>Tracing</h1>
Web API must support real-time tracing or logging of all operations that are executed. And this could be very helpful for developers to see requests sent by applications / client.
<h1>Documentation</h1>
Web APIs must be documented properly. And this is a key in success of API even before many other features. I've seen a huge number of great APIs that lack in documentation and failed to get to the point they planned. Why? Because, naturally no one knows how to use and what to use properly when you don't tell what you've built behind. A proper documentation would be instructions for authorization, authentication, sending all popular methods (GET,POST,PUT,DELETE) in as many platforms as you imagine your API will be used (all programming languages, OSes, if needed, etc). As hospital as you're with people that implement / communicate with your API, as much success you will have. And documentation and sampling is a key in this flow.

These paragraphs I wrote above are from my experience and wanted to share with you, dear reader, and it would be great to have your comment in:

- what's great API according to you?
- mention two or three APIs you like? Why?
