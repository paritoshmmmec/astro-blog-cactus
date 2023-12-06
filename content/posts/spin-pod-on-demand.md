---
external: false
title: "Spin k8 pods on demand"
description: "k8 api usage"
date: 2023-12-01
tags: ["k8", "pods"]
---


## Introduction

Recently, I was working on my lightweight workflow orchestrator project. I wanted to spin the K8 pod on demand instead of going through the command line, as we saw in the previous post. We are going to use Python for scripting and K8 Python for this example.

## Plan

1. Use any custom docker image or test image. We are going to busy-box to demonstrate this.
2. Utilize python k8 client to interact with cluster.
3. Run the script and read output from the stream.

## Script

This script loads Kubectl configuration from the local machine and configures the client. Next, we are checking whether pod exists or not by using `the 'read_namespaced_pod` method, and then creating a pod using the 'create_namespaced_pod' method with `pod_manifest`. We are using JSON as the body when submitting a request to the cluster, but you can write this in YAML format too.

After this step, pods will be created in clusters. You can check the Kubectl `get pods` to see running pods.

Please note that we are using Kubectl config to create this pod, so we don't need to worry about authentication or authorization. I will write a detailed article to do so.

```

import time

from kubernetes import config
from kubernetes.client import Configuration
from kubernetes.client.api import core_v1_api
from kubernetes.client.rest import ApiException
from kubernetes.stream import stream


def exec_commands(api_instance):
    name = 'busybox-test'
    resp = None
    try:
        resp = api_instance.read_namespaced_pod(name=name,
                                                namespace='default')
    except ApiException as e:
        if e.status != 404:
            print(f"Unknown error: {e}")
            exit(1)

    if not resp:
        print(f"Pod {name} does not exist. Creating it...")
        pod_manifest = {
            'apiVersion': 'v1',
            'kind': 'Pod',
            'metadata': {
                'name': name
            },
            'spec': {
                'containers': [{
                    'image': 'busybox',
                    'name': 'sleep',
                    "args": [
                        "/bin/sh",
                        "-c",
                        "while true;do date;sleep 5; done"
                    ]
                }]
            }
        }
        resp = api_instance.create_namespaced_pod(body=pod_manifest,
                                                  namespace='default')
        while True:
            resp = api_instance.read_namespaced_pod(name=name,
                                                    namespace='default')
            if resp.status.phase != 'Pending':
                break
            time.sleep(1)
        print("Done.")

    # Calling exec and waiting for response
    exec_command = [
        '/bin/sh',
        '-c',
        'echo This message goes to stderr; echo This message goes to stdout']
    # When calling a pod with multiple containers running the target container
    # has to be specified with a keyword argument container=<name>.
    resp = stream(api_instance.connect_get_namespaced_pod_exec,
                  name,
                  'default',
                  command=exec_command,
                  stderr=True, stdin=False,
                  stdout=True, tty=False)
    print("Response: " + resp)

    # Calling exec interactively
    exec_command = ['/bin/sh']
    resp = stream(api_instance.connect_get_namespaced_pod_exec,
                  name,
                  'default',
                  command=exec_command,
                  stderr=True, stdin=True,
                  stdout=True, tty=False,
                  _preload_content=False)
    commands = [
        "echo This message goes to stdout",
        "echo \"This message goes to stderr\" >&2",
    ]

    while resp.is_open():
        resp.update(timeout=1)
        if resp.peek_stdout():
            print(f"STDOUT: {resp.read_stdout()}")
        if resp.peek_stderr():
            print(f"STDERR: {resp.read_stderr()}")
        if commands:
            c = commands.pop(0)
            print(f"Running command... {c}\n")
            resp.write_stdin(c + "\n")
        else:
            break

    resp.write_stdin("date\n")
    sdate = resp.readline_stdout(timeout=3)
    print(f"Server date command returns: {sdate}")
    resp.write_stdin("whoami\n")
    user = resp.readline_stdout(timeout=3)
    print(f"Server user is: {user}")
    resp.close()


def main():
    config.load_kube_config()
    try:
        c = Configuration().get_default_copy()
    except AttributeError:
        c = Configuration()
        c.assert_hostname = False
    Configuration.set_default(c)
    core_v1 = core_v1_api.CoreV1Api()

    exec_commands(core_v1)


if __name__ == '__main__':
    main()


```

Output of this might looks like this:

![Running pods](./images/pods-running.png)

Let us see this in pod in k8 dashboard

![Running pods](./images/pod-status.png)

Voila!!! you have a running pod in k8. Wooohooooo......
