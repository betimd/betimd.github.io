---
layout: post
title: Registration error... Windows Phone with Windows Azure debugging problem!
date: 2012-05-14 01:13
author: betim
comments: true
categories: [443, 444, betim drenica, C#, Development, Programming, web role, Windows Azure, windows azure, Windows Phone, windows phone, wrong port]
---
You just have started to trying out the <a href="http://watoolkitwp7.codeplex.com/" target="_blank">Windows Azure Toolkit for Windows Phone 7</a>, and created your first sample application. Then , when you launch the admin page, you get this error:

<em>Sorry, an error occurred while processing your request.
WP7CloudApp1.Web.Infrastructure.RoleInWrongPortException: The Web role was started in a wrong port. For this sample application to work correctly, please make sure that it is running in port 443. Please review the Troubleshooting section of the sample documentation for instructions on how to do this.</em>

<a href="http://blog.betimdrenica.com/wp-content/uploads/2012/05/azureregistrationproblem.png"><img class="aligncenter size-full wp-image-361" title="AzureRegistrationProblem" src="http://blog.betimdrenica.com/wp-content/uploads/2012/05/azureregistrationproblem.png" alt="" width="640" height="331" /></a>

Interesting. You notice that in the address bar, Internet Explorer has for some reason browsed to port 444 instead of the expected port 443. Looking at the documentation on MSDN for Azure, in the <a href="http://msdn.microsoft.com/en-us/library/ff795779.aspx" target="_blank">paragraph Testing an HTTPS endpoint in the compute emulator</a>, one can find this little tidbit: <em>If a port that you specify is not available, in the case of an HTTPS endpoint 443, the compute emulator will increment the port number until it finds one that is free.</em>

There are several solutions proposed in web, like one that is to change port in Compute Emulator when you start debugging. But I personally did another solution, that is maybe dude but it functions well :D.

In Web project (ASP.Net MVC3) in Global.asax.cs I changed Default HTTPS Port const from
<pre>private const int DefaultHttpsPort = <strong>443</strong>;</pre>
to
<pre>private const int DefaultHttpsPort = <strong>444</strong>;</pre>
and voila :D I received message
<h3>Welcome to the administration site for the Mobile Cloud Application Services!</h3>
