from aws_cdk import Stack, aws_ecr as ecr, RemovalPolicy
from constructs import Construct


class ContainerStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        self.backend_repo = ecr.Repository(
            self, "Backend",
            repository_name="exchange-backend",
            removal_policy=RemovalPolicy.DESTROY,
            empty_on_delete=True,
            image_scan_on_push=True,
        )

        self.frontend_repo = ecr.Repository(
            self, "Frontend",
            repository_name="exchange-frontend",
            removal_policy=RemovalPolicy.DESTROY,
            empty_on_delete=True,
            image_scan_on_push=True,
        )
