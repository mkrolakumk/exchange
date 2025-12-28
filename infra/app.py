#!/usr/bin/env python3
import os
from aws_cdk import App, Environment
from stacks.network_stack import NetworkStack
from stacks.database_stack import DatabaseStack
from stacks.container_stack import ContainerStack
from stacks.compute_stack import ComputeStack
from stacks.cdn_stack import CdnStack

env = Environment(
    account=os.environ.get("CDK_DEFAULT_ACCOUNT"),
    region=os.environ.get("CDK_DEFAULT_REGION", "eu-central-1")
)

app = App()

network_stack = NetworkStack(app, "ExchangeNetwork", env=env)

database_stack = DatabaseStack(
    app, "ExchangeDatabase",
    vpc=network_stack.vpc,
    db_security_group=network_stack.db_security_group,
    env=env
)
database_stack.add_dependency(network_stack)

container_stack = ContainerStack(app, "ExchangeContainers", env=env)

compute_stack = ComputeStack(
    app, "ExchangeCompute",
    vpc=network_stack.vpc,
    ecs_security_group=network_stack.ecs_security_group,
    alb_security_group=network_stack.alb_security_group,
    database=database_stack.database,
    db_secret=database_stack.db_secret,
    backend_repo=container_stack.backend_repo,
    frontend_repo=container_stack.frontend_repo,
    env=env
)
compute_stack.add_dependency(network_stack)
compute_stack.add_dependency(database_stack)
compute_stack.add_dependency(container_stack)

cdn_stack = CdnStack(
    app, "ExchangeCDN",
    alb=compute_stack.alb,
    env=env
)
cdn_stack.add_dependency(compute_stack)

app.synth()
