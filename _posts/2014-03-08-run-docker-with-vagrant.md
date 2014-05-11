---
layout: blog_entry
title: "Run Docker in VirtualBox with Vagrant on Mac OS X"
---

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
download and install both [VirtualBox][5] and [Vagrant][6]. Make a new
directory on your Mac and in that directory create a text file called
`Vagrantfile` with these contents:

    # -*- mode: ruby -*-
    # vi: set ft=ruby :

    VAGRANTFILE_API_VERSION = "2"

    Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
      config.vm.box = "precise64"
      config.vm.box_url = "http://files.vagrantup.com/precise64.box"
    end

    Vagrant.configure("2") do |config|
      for i in 49000..49900
        config.vm.network "forwarded_port", guest: i, host: i
      end
    end

This specifies a new 64-bit Ubuntu 12.04 virtual machine and conveniently
forwards all ports in the range `49000..49900` from the host to the virtual
machine. That way, if you run a web server (for example) from your VM, you can
open a web browser from your Mac and see your site.

Then, we just start up the VM, establish an SSH connection with it, and install
Docker.

    Your-Mac:docker-vm$ vagrant up
    Your-Mac:docker-vm$ vagrant ssh
    vagrant@precise64:~$ sudo apt-get update
    vagrant@precise64:~$ sudo apt-get install -y curl
    vagrant@precise64:~$ curl https://get.docker.io/ubuntu/ | sudo sh

You can optionally add the `vagrant` user to the `docker` group so that you
don't have to write "sudo" before every privileged `docker`
command:

    sudo usermod -aG docker vagrant

You'll have to log out (`^D`) and log back in (`vagrant ssh`) for that last
change to take effect.

[1]: https://www.docker.io/
[2]: https://github.com/dotcloud/docker/blob/master/CHANGELOG.md
[3]: https://github.com/dotcloud/docker/pull/4281
[4]: http://docs.docker.io/en/latest/installation/mac/
[5]: https://www.virtualbox.org/
[6]: http://www.vagrantup.com/
