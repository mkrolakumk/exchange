from aws_cdk import Stack, Duration, aws_ec2 as ec2, aws_ecs as ecs, aws_ecr as ecr, aws_rds as rds, aws_elasticloadbalancingv2 as elbv2, aws_logs as logs, aws_secretsmanager as secretsmanager, CfnOutput
from constructs import Construct


class ComputeStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, vpc: ec2.Vpc, ecs_security_group: ec2.SecurityGroup, alb_security_group: ec2.SecurityGroup, database: rds.DatabaseInstance, db_secret: secretsmanager.Secret, backend_repo: ecr.Repository, frontend_repo: ecr.Repository, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        token_secret = secretsmanager.Secret(
            self, "TokenSecret",
            generate_secret_string=secretsmanager.SecretStringGenerator(
                exclude_punctuation=True,
                password_length=64
            )
        )

        cluster = ecs.Cluster(self, "Cluster", vpc=vpc,
                              container_insights=True)

        backend_task = ecs.FargateTaskDefinition(
            self, "BackendTask", memory_limit_mib=512, cpu=256)

        db_secret.grant_read(backend_task.task_role)
        token_secret.grant_read(backend_task.task_role)

        backend_container = backend_task.add_container(
            "Backend",
            image=ecs.ContainerImage.from_ecr_repository(
                backend_repo, tag="latest"),
            environment={
                "DB__HOST": database.db_instance_endpoint_address,
                "DB__PORT": "5432",
                "DB__DATABASE": "postgres",
                "TOKEN__ALGORITHM": "HS256",
                "TOKEN__ACCESS_TOKEN_EXPIRE_MINUTES": "30",
                "CURRENCY_API__ADDRESS": "https://api.nbp.pl/api/",
                "API_ROOT_PATH": "/api",
            },
            secrets={
                "DB__USER": ecs.Secret.from_secrets_manager(db_secret, "username"),
                "DB__PASSWORD": ecs.Secret.from_secrets_manager(db_secret, "password"),
                "TOKEN__SECRET_KEY": ecs.Secret.from_secrets_manager(token_secret),
            },
            logging=ecs.LogDrivers.aws_logs(
                stream_prefix="backend", log_retention=logs.RetentionDays.ONE_WEEK),
            port_mappings=[ecs.PortMapping(
                container_port=8000, protocol=ecs.Protocol.TCP)],
        )

        frontend_task = ecs.FargateTaskDefinition(
            self, "FrontendTask", memory_limit_mib=512, cpu=256)
        frontend_container = frontend_task.add_container(
            "Frontend",
            image=ecs.ContainerImage.from_ecr_repository(
                frontend_repo, tag="latest"),
            environment={
                "ENVIRONMENT": "aws",
            },
            logging=ecs.LogDrivers.aws_logs(
                stream_prefix="frontend", log_retention=logs.RetentionDays.ONE_WEEK),
            port_mappings=[ecs.PortMapping(
                container_port=80, protocol=ecs.Protocol.TCP)],
        )

        backend_service = ecs.FargateService(
            self, "BackendService", cluster=cluster, task_definition=backend_task, desired_count=1,
            security_groups=[ecs_security_group], vpc_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS)
        )
        frontend_service = ecs.FargateService(
            self, "FrontendService", cluster=cluster, task_definition=frontend_task, desired_count=1,
            security_groups=[ecs_security_group], vpc_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS)
        )

        alb = elbv2.ApplicationLoadBalancer(
            self, "ALB", vpc=vpc, internet_facing=True,
            security_group=alb_security_group,
            vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PUBLIC)
        )

        listener = alb.add_listener("HTTPListener", port=80, open=True)

        backend_target = listener.add_targets(
            "BackendTarget", port=8000, targets=[backend_service],
            health_check=elbv2.HealthCheck(path="/status", interval=Duration.seconds(
                30), timeout=Duration.seconds(5), healthy_threshold_count=2, unhealthy_threshold_count=3),
            priority=1, conditions=[elbv2.ListenerCondition.path_patterns(["/api/*"])]
        )

        frontend_target = listener.add_targets(
            "FrontendTarget", port=80, targets=[frontend_service],
            health_check=elbv2.HealthCheck(path="/", interval=Duration.seconds(
                30), timeout=Duration.seconds(5), healthy_threshold_count=2, unhealthy_threshold_count=3)
        )

        ecs_security_group.add_ingress_rule(ec2.Peer.security_group_id(
            alb.connections.security_groups[0].security_group_id), ec2.Port.all_tcp(), "ALB")
        database.connections.allow_from(
            ecs_security_group, ec2.Port.tcp(5432), "Backend->RDS")

        self.alb = alb

        CfnOutput(self, "LoadBalancerDNS",
                  value=alb.load_balancer_dns_name)
