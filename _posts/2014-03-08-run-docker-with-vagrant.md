---
layout: blog_entry
title: "Run Docker in VirtualBox with Vagrant on Mac OS X"
---

<ins datetime="2014-10-16">*Update (Oct 16, 2014):* [Docker 1.3][8] and the
corresponding update to `boot2docker` obsoletes this workaround by allowing you
to mount directories directy from OS X to Docker containers.</ins>

[Docker][1] used to include a nice Vagrantfile, and this was the preferred way
to run Docker on OS X. Since version [0.8.1][2] ([PR #4281][3]), though, the
Docker documentation refers Mac OS X users to `boot2docker`. `boot2docker` runs
the Docker daemon in a [VirtualBox][5] VM, but the Docker client runs from the
host Mac OS X machine. That's super cool, and props to the Docker
developers for getting that to all work. That said, I can't stand it for
doing any sort of application development because when you run `docker run -v`,
host directories refer to the machine running the Docker daemon, not the
client. This means that I can't easily mount directories right from
my Mac.

I advocate instead running both the Docker client and server in a virtual
machine in VirtualBox using [Vagrant][6]. If you haven't done so already,
download and install both [VirtualBox][5] and [Vagrant][6]. Vagrant uses a
text file named `Vagrantfile` to configure new virtual machines. By default,
Vagrant will synchronize the contents of the directory in which a `Vagrantfile`
resides to the VM's `/vagrant` directory. This is very helpful if you'd like to
modify source files on your Mac with your favorite tools and run corresponding
Docker containers on the VM. Here's a `Vagrantfile` to get you started:

```ruby
# -*- mode: ruby -*-
# vi: set ft=ruby :

VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  config.vm.box = "precise64"
  config.vm.box_url = "http://files.vagrantup.com/precise64.box"
  config.vm.provision "docker"
  for i in 49000..49900
    config.vm.network "forwarded_port", guest: i, host: i
  end
end
```

This specifies a new 64-bit Ubuntu 12.04 virtual machine with Docker and
conveniently forwards all ports in the range `49000..49900` from the host to
the virtual machine. That way, if you run a web server (for example) from your
VM, you can open a web browser from your Mac and see your site.

Then, we just start up the VM, establish an SSH connection with it, and start
using Docker.

    Your-Mac:docker-vm$ vagrant up
    Your-Mac:docker-vm$ vagrant ssh
    vagrant@precise64:~$ docker ps

Vagrant's Docker Provisioner, by the way, can do some pretty neat tricks like
building Docker images upon provisioning. Check out [the docs][7].

[1]: https://www.docker.io/
[2]: https://github.com/dotcloud/docker/blob/master/CHANGELOG.md
[3]: https://github.com/dotcloud/docker/pull/4281
[4]: http://docs.docker.io/en/latest/installation/mac/
[5]: https://www.virtualbox.org/
[6]: http://www.vagrantup.com/
[7]: http://docs.vagrantup.com/v2/provisioning/docker.html
[8]: https://blog.docker.com/2014/10/docker-1-3-signed-images-process-injection-security-options-mac-shared-directories/
